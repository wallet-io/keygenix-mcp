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
            keyCode: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            orderDirection: {
                type: string;
                enum: string[];
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
export declare const updateKeyTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            keyCode: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            remark: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const getPublicKeyTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            keyCode: {
                type: string;
                description: string;
            };
            curve: {
                type: string;
                enum: string[];
                description: string;
            };
            path: {
                type: string;
                description: string;
            };
            deriveType: {
                type: string;
                enum: string[];
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
            curve: {
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
export declare const exportKeyTool: {
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
export declare function handleListKeys(config: KeygenixConfig, args: {
    page?: number;
    size?: number;
    keyCode?: string;
    name?: string;
    orderDirection?: string;
}): Promise<unknown>;
export declare function handleGetKey(config: KeygenixConfig, args: {
    keyCode: string;
}): Promise<unknown>;
export declare function handleUpdateKey(config: KeygenixConfig, args: {
    keyCode: string;
    name?: string;
    remark?: string;
}): Promise<unknown>;
export declare function handleGetPublicKey(config: KeygenixConfig, args: {
    keyCode: string;
    curve?: string;
    path?: string;
    deriveType?: string;
}): Promise<unknown>;
export declare function handleCreateKey(config: KeygenixConfig, args: {
    keyType: string;
    curve?: string;
    chains?: string[];
}): Promise<unknown>;
export declare function handleExportKey(config: KeygenixConfig, args: {
    keyCode: string;
}): Promise<any>;
//# sourceMappingURL=keys.d.ts.map