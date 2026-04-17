"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAppStore = void 0;
const zustand_1 = require("zustand");
exports.useAppStore = (0, zustand_1.create)((set) => ({
    newsArticles: [],
    savedNews: [],
    conversationMessages: [],
    selectedNews: null,
    isLoading: false,
    setNewsArticles: (articles) => set({ newsArticles: articles }),
    setSavedNews: (news) => set({ savedNews: news }),
    setConversationMessages: (messages) => set({ conversationMessages: messages }),
    addConversationMessage: (message) => set((state) => ({
        conversationMessages: [...state.conversationMessages, message],
    })),
    setSelectedNews: (news) => set({ selectedNews: news }),
    setIsLoading: (loading) => set({ isLoading: loading }),
}));
