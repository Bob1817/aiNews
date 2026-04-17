export declare const userValidators: {
    register: import("express-validator").ValidationChain[];
    login: import("express-validator").ValidationChain[];
    updateProfile: import("express-validator").ValidationChain[];
};
export declare const newsValidators: {
    create: import("express-validator").ValidationChain[];
    update: import("express-validator").ValidationChain[];
    getById: import("express-validator").ValidationChain[];
    list: import("express-validator").ValidationChain[];
};
export declare const savedNewsValidators: {
    save: import("express-validator").ValidationChain[];
    remove: import("express-validator").ValidationChain[];
};
export declare const categoryValidators: {
    create: import("express-validator").ValidationChain[];
    update: import("express-validator").ValidationChain[];
};
export declare const aiConfigValidators: {
    update: import("express-validator").ValidationChain[];
};
export declare const newsApiConfigValidators: {
    update: import("express-validator").ValidationChain[];
};
export declare const chatValidators: {
    sendMessage: import("express-validator").ValidationChain[];
};
export declare const commonValidators: {
    idParam: import("express-validator").ValidationChain[];
    pagination: import("express-validator").ValidationChain[];
    search: import("express-validator").ValidationChain[];
};
export declare const validators: {
    user: {
        register: import("express-validator").ValidationChain[];
        login: import("express-validator").ValidationChain[];
        updateProfile: import("express-validator").ValidationChain[];
    };
    news: {
        create: import("express-validator").ValidationChain[];
        update: import("express-validator").ValidationChain[];
        getById: import("express-validator").ValidationChain[];
        list: import("express-validator").ValidationChain[];
    };
    savedNews: {
        save: import("express-validator").ValidationChain[];
        remove: import("express-validator").ValidationChain[];
    };
    category: {
        create: import("express-validator").ValidationChain[];
        update: import("express-validator").ValidationChain[];
    };
    aiConfig: {
        update: import("express-validator").ValidationChain[];
    };
    newsApiConfig: {
        update: import("express-validator").ValidationChain[];
    };
    chat: {
        sendMessage: import("express-validator").ValidationChain[];
    };
    common: {
        idParam: import("express-validator").ValidationChain[];
        pagination: import("express-validator").ValidationChain[];
        search: import("express-validator").ValidationChain[];
    };
};
export default validators;
//# sourceMappingURL=validators.d.ts.map