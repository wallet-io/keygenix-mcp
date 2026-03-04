import { KeygenixConfig } from "../api-client.js";
export declare const listKeysTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            page: {
                type: string;
                description: string;
            };
            size: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const getKeyTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            keyCode: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const createKeyTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            keyType: {
                type: string;
                enum: string[];
                description: string;
            };
            chains: {
                type: string;
                items: {
                    type: string;
                    enum: string[];
                };
                description: string;
            };
        };
        required: string[];
    };
};
export declare function handleListKeys(config: KeygenixConfig, args: {
    page?: number;
    size?: number;
}): Promise<unknown>;
export declare function handleGetKey(config: KeygenixConfig, args: {
    keyCode: string;
}): Promise<unknown>;
export declare function handleCreateKey(config: KeygenixConfig, args: {
    keyType: string;
    chains?: string[];
}): Promise<unknown>;
//# sourceMappingURL=keys.d.ts.map