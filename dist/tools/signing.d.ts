import { KeygenixConfig } from "../api-client.js";
export declare const signTransactionTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            keyCode: {
                type: string;
                description: string;
            };
            address: {
                type: string;
                description: string;
            };
            tx: {
                type: string;
                description: string;
            };
            chain: {
                type: string;
                enum: string[];
                description: string;
            };
            chainId: {
                type: string;
                description: string;
            };
            encoding: {
                type: string;
                enum: string[];
                description: string;
            };
            path: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const signMessageTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            keyCode: {
                type: string;
                description: string;
            };
            address: {
                type: string;
                description: string;
            };
            message: {
                type: string;
                description: string;
            };
            chain: {
                type: string;
                enum: string[];
                description: string;
            };
            path: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function handleSignTransaction(config: KeygenixConfig, args: {
    keyCode: string;
    address?: string;
    tx: string;
    chain: string;
    chainId?: number;
    encoding?: string;
    path?: string;
}): Promise<unknown>;
export declare function handleSignMessage(config: KeygenixConfig, args: {
    keyCode: string;
    address?: string;
    message: string;
    chain?: string;
    path?: string;
}): Promise<unknown>;
//# sourceMappingURL=signing.d.ts.map