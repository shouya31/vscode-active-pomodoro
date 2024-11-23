import * as vscode from 'vscode';

let pomodoroCount = 0;
let isRunning = false;
let focusTime = 25; // デフォルト25分
let breakTime = 5;  // デフォルト5分
let totalSessions = 4; // デフォルト4回
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
            vscode.window.showInformationMessage('ポモドーロは既に開始されています。');
            return;
        }

        isRunning = true;

        // ユーザー入力の取得
        focusTime = await getInput('集中時間（分）を入力してください。', focusTime);
        breakTime = await getInput('休憩時間（分）を入力してください。', breakTime);
        totalSessions = await getInput('ポモドーロの回数を入力してください。', totalSessions);

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
        vscode.window.showInformationMessage(`今日の集中時間: ${hours}時間${minutes}分${seconds}秒`);
    });

    context.subscriptions.push(startCommand);
    context.subscriptions.push(showTotalTimeCommand);

    statusBarItem.command = 'extension.startPomodoro';
    updateStatusBar();

    // ウィンドウのフォーカスイベントを監視
    vscode.window.onDidChangeWindowState((windowState) => {
        if (windowState.focused) {
            // ウィンドウがフォーカスされたとき
            if (isRunning && !interval) {
                startTimer();
            }
        } else {
            // ウィンドウがフォーカスを失ったとき
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
                    vscode.window.showInformationMessage('ポモドーロが完了しました！');
                    clearInterval(interval);
                    interval = undefined;
                    isRunning = false;
                    updateStatusBar();
                    return;
                } else {
                    vscode.window.showInformationMessage('休憩時間です！');
                    isFocus = false;
                    remainingTime = breakTime * 60;
                }
            } else {
                currentSession++;
                vscode.window.showInformationMessage('次のポモドーロを開始します！');
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
        statusBarItem.text = `$(clock) ポモドーロ ${currentSession}/${totalSessions} - ${isFocus ? '集中' : '休憩'}: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
        statusBarItem.text = `$(clock) ポモドーロ開始`;
    }
    statusBarItem.show();
}

export function deactivate() {
    if (interval) {
        clearInterval(interval);
    }
    statusBarItem.hide();
}
