import { App, TFile, TFolder, normalizePath } from "obsidian";

export class SurveyFileWriter {
  constructor(private readonly app: App) {}

  async write(folder: string, fileName: string, content: string, collisionMode: "append" | "increment" | "overwrite"): Promise<TFile> {
    const safeFolder = this.normalizeFolder(folder);
    const safeName = this.sanitizeFileName(fileName);
    const initialPath = normalizePath(safeFolder ? `${safeFolder}/${safeName}.md` : `${safeName}.md`);
    await this.ensureFolders(safeFolder);
    const existing = this.app.vault.getAbstractFileByPath(initialPath);
    if (existing instanceof TFolder) throw new Error(`目标路径“${initialPath}”是文件夹。`);
    if (existing instanceof TFile) {
      if (collisionMode === "overwrite") { await this.app.vault.modify(existing, content); return existing; }
      if (collisionMode === "append") { await this.app.vault.append(existing, `\n\n${content}`); return existing; }
      const uniquePath = this.nextAvailablePath(safeFolder, safeName);
      return this.app.vault.create(uniquePath, content);
    }
    return this.app.vault.create(initialPath, content);
  }

  private normalizeFolder(folder: string): string {
    const value = normalizePath((folder ?? "").trim()).replace(/^\/+|\/+$/g, "");
    if (value === ".") return "";
    if (value === ".." || value.startsWith("../") || value.includes("/../")) throw new Error("目标文件夹不能包含上级目录路径。 ");
    return value;
  }

  private sanitizeFileName(name: string): string {
    const value = name.replace(/[\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().replace(/\.+$/g, "");
    if (!value) throw new Error("生成的笔记名为空。 ");
    return value;
  }

  private async ensureFolders(folder: string): Promise<void> {
    if (!folder) return;
    let current = "";
    for (const part of folder.split("/")) {
      current = current ? `${current}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (existing instanceof TFile) throw new Error(`无法创建文件夹“${current}”，因为同名文件已存在。`);
      if (!existing) await this.app.vault.createFolder(current);
    }
  }

  private nextAvailablePath(folder: string, baseName: string): string {
    for (let i = 2; i <= 9999; i++) {
      const path = normalizePath(folder ? `${folder}/${baseName} (${i}).md` : `${baseName} (${i}).md`);
      if (!this.app.vault.getAbstractFileByPath(path)) return path;
    }
    throw new Error("无法生成不重复的笔记名。 ");
  }
}
