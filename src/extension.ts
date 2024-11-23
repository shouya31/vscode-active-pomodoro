import * as vscode from 'vscode';

let pomodoroCount = 0;
let isRunning = false;
let focusTime = 25;
let breakTime = 5;
let totalSessions = 4;
let currentSession = 0;
let interval: NodeJS.Timeout | undefined;
let statusBarItem: vscode.StatusBarItem;
let remainingTime = focusTime * 60;
let isFocus = true;
let totalFocusTime = 0;

export function activate(context: vscode.ExtensionContext) {

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    context.subscriptions.push(statusBarItem);

    const startCommand = vscode.commands.registerCommand('extension.startPomodoro', async () => {
        if (isRunning) {
            vscode.window.showInformationMessage('Pomodoro is already running.');
            return;
        }

        isRunning = true;

        focusTime = await getInput('Enter focus time (minutes):', focusTime);
        breakTime = await getInput('Enter break time (minutes):', breakTime);
        totalSessions = await getInput('Enter number of pomodoro sessions:', totalSessions);

        currentSession = 1;
        remainingTime = focusTime * 60;
        isFocus = true;

        updateStatusBar();
        startTimer();
    });

    const showTotalTimeCommand = vscode.commands.registerCommand('extension.showTotalFocusTime', () => {
        const hours = Math.floor(totalFocusTime / 3600);
        const minutes = Math.floor((totalFocusTime % 3600) / 60);
        const seconds = totalFocusTime % 60;
        vscode.window.showInformationMessage(`Today's focus time: ${hours}h ${minutes}m ${seconds}s`);
    });

    context.subscriptions.push(startCommand);
    context.subscriptions.push(showTotalTimeCommand);

    statusBarItem.command = 'extension.startPomodoro';
    updateStatusBar();

    vscode.window.onDidChangeWindowState((windowState) => {
        if (windowState.focused) {
            if (isRunning && !interval) {
                startTimer();
            }
        } else {
            if (isRunning && interval) {
                clearInterval(interval);
                interval = undefined;
            }
        }
    });
}

async function getInput(prompt: string, defaultValue: number): Promise<number> {
    const result = await vscode.window.showInputBox({
        prompt: prompt,
        value: defaultValue.toString()
    });
    return result ? parseInt(result) : defaultValue;
}

function startTimer() {
    interval = setInterval(() => {
        remainingTime--;

        if (isFocus) {
            totalFocusTime++;
        }

        if (remainingTime <= 0) {
            if (isFocus) {
                if (currentSession >= totalSessions) {
                    vscode.window.showInformationMessage('Pomodoro sessions completed!');
                    clearInterval(interval);
                    interval = undefined;
                    isRunning = false;
                    updateStatusBar();
                    return;
                } else {
                    vscode.window.showInformationMessage('Time for a break!');
                    isFocus = false;
                    remainingTime = breakTime * 60;
                }
            } else {
                currentSession++;
                vscode.window.showInformationMessage('Starting next pomodoro session!');
                isFocus = true;
                remainingTime = focusTime * 60;
            }
        }

        updateStatusBar();
    }, 1000);
}

function updateStatusBar() {
    if (isRunning) {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        statusBarItem.text = `$(clock) pomodoro ${currentSession}/${totalSessions} - ${isFocus ? 'focus' : 'break'}: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
        statusBarItem.text = `$(clock) start pomodoro`;
    }
    statusBarItem.show();
}

export function deactivate() {
    if (interval) {
        clearInterval(interval);
    }
    statusBarItem.hide();
}
