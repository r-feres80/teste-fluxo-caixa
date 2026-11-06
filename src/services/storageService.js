// Nenhum componente ou página deve chamar localStorage diretamente.
// Trocar localStorage -> banco de dados -> API é alterar só este arquivo.

import { STORAGE_KEY } from "../config/appConfig.js";

function assertKey(key) {
  if (!key.startsWith(STORAGE_KEY)) {
    throw new Error(`Persistência: chave fora do namespace esperado. Recebida: "${key}".`);
  }
}

const localStorageProvider = {
  async getItem(key) {
    assertKey(key);
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("storageService.getItem falhou:", e);
      return null;
    }
  },
  async setItem(key, value) {
    assertKey(key);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("storageService.setItem falhou:", e);
      return false;
    }
  },
  async removeItem(key) {
    assertKey(key);
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error("storageService.removeItem falhou:", e);
      return false;
    }
  },
};

export const storageService = localStorageProvider;
