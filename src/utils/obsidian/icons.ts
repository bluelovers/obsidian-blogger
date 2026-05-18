import { addIcon } from 'obsidian';
import { icons } from '../icons';

export const addIcons = (): void => {
  Object.keys(icons).forEach((key) => {
    addIcon(key, icons[key]);
  });
};
