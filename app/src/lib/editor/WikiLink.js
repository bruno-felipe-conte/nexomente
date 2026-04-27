import { Mark, mergeAttributes } from '@tiptap/core';

export const WikiLink = Mark.create({
  name: 'wikiLink',
  
  addAttributes() {
    return {
      href: {
        default: null,
      },
      noteId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a.wiki-link',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(
        { class: 'wiki-link text-[#6C63FF] hover:underline cursor-pointer' },
        HTMLAttributes
      ),
      0,
    ];
  },
});

export default WikiLink;