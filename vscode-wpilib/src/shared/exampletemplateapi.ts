'use scrict';

import * as path from 'path';
import { promisifyReadFile, promisifyWriteFile } from '../utilities';
import * as vscode from '../vscodeshim';
import { ICreatorQuickPick, IExampleTemplateAPI, IExampleTemplateCreator } from '../wpilibapishim';
import { promisifyMkdirp } from './generator';
import { IPreferencesJson } from './preferencesjson';

export class ExampleTemplateAPI implements IExampleTemplateAPI {
  private templates: ICreatorQuickPick[] = [];
  private examples: ICreatorQuickPick[] = [];

  public addTemplateProvider(provider: IExampleTemplateCreator): void {
    const lp: ICreatorQuickPick = {
      creator: provider,
      description: provider.getDescription(),
      label: provider.getDisplayName(),
    };
    this.templates.push(lp);
  }
  public addExampleProvider(provider: IExampleTemplateCreator): void {
    const lp: ICreatorQuickPick = {
      creator: provider,
      description: provider.getDescription(),
      label: provider.getDisplayName(),
    };
    this.examples.push(lp);
  }

  public getLanguages(template: boolean): string[] {
    const retSet: Set<string> = new Set();
    if (template) {
      for (const t of this.templates) {
        retSet.add(t.creator.getLanguage());
      }
    } else {
      for (const t of this.examples) {
        retSet.add(t.creator.getLanguage());
      }
    }
    return Array.from(retSet);
  }

  public getBases(template: boolean, language: string): ICreatorQuickPick[] {
    const ret: ICreatorQuickPick[] = [];
    if (template) {
      for (const t of this.templates) {
        if (t.creator.getLanguage() === language) {
          ret.push(t);
        }
      }
    } else {
      for (const t of this.examples) {
        if (t.creator.getLanguage() === language) {
          ret.push(t);
        }
      }
    }
    return ret;
  }

  public dispose() {
    //
  }

  public async createProject(template: boolean, language: string, base: string, toFolder: string,
                             newFolder: boolean, projectName: string, teamNumber: number): Promise<boolean> {
    if (template) {
      for (const t of this.templates) {
        if (t.creator.getLanguage() === language && t.label === base) {
          return this.handleGenerate(t.creator, toFolder, newFolder, projectName, teamNumber);
        }
      }
    } else {
      for (const t of this.examples) {
        if (t.creator.getLanguage() === language && t.label === base) {
          return this.handleGenerate(t.creator, toFolder, newFolder, projectName, teamNumber);
        }
      }
    }
    return false;
  }

  private async handleGenerate(creator: IExampleTemplateCreator, toFolderOrig: string, newFolder: boolean,
                               projectName: string, teamNumber: number): Promise<boolean> {
    let toFolder = toFolderOrig;

    if (newFolder) {
      toFolder = path.join(toFolderOrig, projectName);
    }

    try {
      await promisifyMkdirp(toFolder);
    } catch {
      //
    }
    const toFolderUri = vscode.Uri.file(toFolder);

    const success = await creator.generate(toFolderUri);

    if (!success) {
      return false;
    }

    const jsonFilePath = path.join(toFolder, '.wpilib', 'wpilib_preferences.json');

    const parsed = JSON.parse(await promisifyReadFile(jsonFilePath)) as IPreferencesJson;
    parsed.teamNumber = teamNumber;
    await promisifyWriteFile(jsonFilePath, JSON.stringify(parsed, null, 4));

    return true;
  }
}
