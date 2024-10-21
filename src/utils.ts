import * as vscode from 'vscode';

const OPENAI_API_KEY = "OPENAI_API_KEY";

interface Config {
    apiKey?: string,
    organization?: string,
    provider: 'openai' | 'ollama'
}

interface Payload {
    model: string,
    prompt: string,
    max_tokens: number,
    temperature: number,
}

interface ChatPayload {
    model: string,
    messages: Array<any>,
    max_tokens: number,
    temperature: number,
}

const initAuth = async (context: vscode.ExtensionContext): Promise<Config> => {
    console.log('init');

    const provider = getConfValue('llmProvider') as 'openai' | 'ollama';
    let config: Config = { provider };

    if (provider === 'openai') {
        let apiKey = await context.secrets.get(OPENAI_API_KEY);
        if (process.env["OPENAI_TOKEN"]) {
            apiKey = process.env["OPENAI_TOKEN"];
        }

        if (!apiKey) {
            console.log("API Key doesn't exist in secret storage");
            apiKey = await setNewAPIKey(context);
        }

        config.apiKey = apiKey;

        let org = getConfValue('org');
        if (org) {
            config.organization = org;
        }
    } else if (provider === 'ollama') {
        // nothing for now
    }

    return config;
};

const getConfValue = <T = string>(key: string) => vscode.workspace.getConfiguration('GILT').get(key) as T;

const setNewAPIKey = async (context: vscode.ExtensionContext): Promise<string> => {
    const inputBoxOptions = {
        title: "Please enter your OpenAI API Key",
        prompt: "Store your API Key in secret storage",
        password: true,
        ignoreFocusOut: true
    };

    const secret = await vscode.window.showInputBox(inputBoxOptions);

    if (!secret) {
        vscode.window.showWarningMessage('No API Key received.');
        return "";
    }

    await context.secrets.store(OPENAI_API_KEY, secret);
    return secret;
};

const buildStatusBarItem = (): vscode.StatusBarItem => {
    const statusBarItem = vscode.window.createStatusBarItem();
    statusBarItem.name = "GILT";
    statusBarItem.text = `$(hubot) AI Explanation`;
    statusBarItem.command = "GILT.createExp";
    statusBarItem.tooltip = "Ask AI to help you understand code.";

    return statusBarItem;
};

const getFileExtension = (file: string): string => {
    let activeFile = file;
    let filePathParts = activeFile.split('.');

    return filePathParts[filePathParts.length - 1];
};

const createChatPayload = (type: string, message: Array<any>): ChatPayload => {
    let payload: ChatPayload;
    switch (type) {
        case ("chat"):
        default:
            payload = {
                "model": getConfValue('chatModel'),
                "messages": message,
                "max_tokens": getConfValue<number>('maxTokens'),
                "temperature": getConfValue<number>('temperature')
            };
            break;
    }
    return payload;
}

const createPayload = (type: string, prompt: string): Payload => {
    let payload: Payload;

    switch (type) {
        case ("code"):
            payload = {
                "model": getConfValue('codeModel'),
                "prompt": prompt,
                "max_tokens": getConfValue<number>('codeMaxTokens'),
                "temperature": getConfValue<number>('codeTemperature'),
            };
            break;
        case ('text'):
        default:
            payload = {
                "model": getConfValue('model'),
                "prompt": prompt,
                "max_tokens": getConfValue<number>('maxTokens'),
                "temperature": getConfValue<number>('temperature'),
            };
    }

    return payload;
};

const validatePayload = (payload: Payload) => {
    let reason = "";
    let isValid = true;

    if (!payload.temperature || payload.temperature < 0 || payload.temperature > 1) {
        reason = "Temperature must be between 0 and 1, please update your settings";
        isValid = false;
    }

    if (!payload.max_tokens || payload.max_tokens < 1 || payload.max_tokens >= 4000) {
        reason = "Max tokens must be between 1 and 4000, please update your settings";
        isValid = false;
    }

    if (!payload.model) {
        reason = "LLM Model missing, please update your settings";
        isValid = false;
    }

    return { isValid, reason };
};

const validateChatPayload = (payload: ChatPayload) => {
    let reason = "";
    let isValid = true;

    if (!payload.temperature || payload.temperature < 0 || payload.temperature > 1) {
        reason = "Temperature must be between 0 and 1, please update your settings";
        isValid = false;
    }

    if (!payload.max_tokens || payload.max_tokens < 1 || payload.max_tokens >= 4000) {
        reason = "Max tokens must be between 1 and 4000, please update your settings";
        isValid = false;
    }

    if (!payload.model) {
        reason = "LLM Model missing, please update your settings";
        isValid = false;
    }

    return { isValid, reason };
};

export {
    initAuth,
    createPayload,
    createChatPayload,
    validatePayload,
    validateChatPayload,
    getConfValue,
    setNewAPIKey,
    getFileExtension,
    buildStatusBarItem,
    Config,
    OPENAI_API_KEY,
};
