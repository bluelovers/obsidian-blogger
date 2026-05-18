import MarkdownIt, { Token } from 'markdown-it';
import { trim } from 'lodash-es';


export interface IMarkdownItImageActionParams
{
  src: string;
  width?: string;
  height?: string;
}

interface IMarkdownItImagePluginOptions
{
  doWithImage: (img: IMarkdownItImageActionParams) => void;
}

const pluginOptions: IMarkdownItImagePluginOptions = {
  doWithImage: () => {},
}

export const MarkdownItImagePluginInstance = {
  plugin: pluginImpl,
  doWithImage: (action: (img: IMarkdownItImageActionParams) => void) => {
    pluginOptions.doWithImage = action;
  },
}

function pluginImpl(md: MarkdownIt): void {
  md.inline.ruler.after('image', 'ob_img', (state, silent) => {
    const regex = /^!\[\[([^|\]\n]+)(\|([^\]\n]+))?\]\]/;
    const match = state.src.slice(state.pos).match(regex);
    if (match) {
      if (silent) {
        return true;
      }
      const token = state.push('ob_img', 'img', 0);
      const matched = match[0];
      const src = match[1];
      const size = match[3];
      let width: string | undefined;
      let height: string | undefined;
      if (size) {
        const sepIndex = size.indexOf('x'); // width x height
        if (sepIndex > 0) {
          width = trim(size.substring(0, sepIndex));
          height = trim(size.substring(sepIndex + 1));
          token.attrs = [
            [ 'src', src ],
            [ 'width', width ],
            [ 'height', height ],
          ];
        } else {
          width = trim(size);
          token.attrs = [
            [ 'src', src ],
            [ 'width', width ],
          ];
        }
      } else {
        token.attrs = [
          [ 'src', src ],
        ];
      }
      if (pluginOptions.doWithImage) {
        pluginOptions.doWithImage({
          src: token.attrs?.[0]?.[1],
          width: token.attrs?.[1]?.[1],
          height: token.attrs?.[2]?.[1],
        });
      }
      state.pos += matched.length;
      return true;
    } else {
      return false;
    }
  });
  md.renderer.rules.ob_img = (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    const src = token.attrs?.[0]?.[1];
    const width = token.attrs?.[1]?.[1];
    const height = token.attrs?.[2]?.[1];
    if (width) {
      if (height) {
        return `<img ${src}="../.." width="${width}" height="${height}" alt="">`;
      }
      return `<img ${src}="../.." width="${width}" alt="">`;
    } else {
      return `<img ${src}="../.." alt="">`;
    }
  };
}
