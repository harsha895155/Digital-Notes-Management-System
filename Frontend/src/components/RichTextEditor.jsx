import React, { useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';

export default function RichTextEditor({ value, onChange, placeholder = 'Write your thoughts here...', minHeight = '220px' }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      // Only update if fundamentally different to avoid cursor jumping
      if (value === '' && editorRef.current.innerHTML === '<br>') return;
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const cleanHtml = DOMPurify.sanitize(editorRef.current.innerHTML, {
        ALLOWED_TAGS: ['b', 'i', 'u', 's', 'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'br', 'span', 'strong', 'em'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
      });
      onChange(cleanHtml);
    }
  };

  const executeCmd = (command, val = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, val);
    handleInput();
  };

  const handleAddLink = () => {
    const url = prompt('Enter URL (e.g. https://example.com):');
    if (url) {
      const validUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      executeCmd('createLink', validUrl);
    }
  };

  return (
    <div className="minddesk-rich-editor rounded border shadow-sm bg-white" style={{ borderColor: 'var(--border-color, #E8DFD8)' }}>
      {/* Formatting Toolbar */}
      <div className="d-flex flex-wrap align-items-center gap-1 p-2 border-bottom bg-light" style={{ backgroundColor: '#FAF6F0' }}>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('bold')}
          title="Bold (Ctrl+B)"
        >
          <i className="bi bi-type-bold"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('italic')}
          title="Italic (Ctrl+I)"
        >
          <i className="bi bi-type-italic"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('underline')}
          title="Underline (Ctrl+U)"
        >
          <i className="bi bi-type-underline"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('strikeThrough')}
          title="Strikethrough"
        >
          <i className="bi bi-type-strikethrough"></i>
        </button>

        <span className="vr mx-1"></span>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('formatBlock', '<h2>')}
          title="Heading"
        >
          <i className="bi bi-type-h2"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('formatBlock', '<h3>')}
          title="Subheading"
        >
          <i className="bi bi-type-h3"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('formatBlock', '<p>')}
          title="Paragraph / Normal Text"
        >
          <i className="bi bi-paragraph"></i>
        </button>

        <span className="vr mx-1"></span>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('insertUnorderedList')}
          title="Bulleted List"
        >
          <i className="bi bi-list-ul"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('insertOrderedList')}
          title="Numbered List"
        >
          <i className="bi bi-list-ol"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('formatBlock', '<blockquote>')}
          title="Quote"
        >
          <i className="bi bi-quote"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('formatBlock', '<pre>')}
          title="Code Block"
        >
          <i className="bi bi-code-slash"></i>
        </button>

        <span className="vr mx-1"></span>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={handleAddLink}
          title="Insert Link"
        >
          <i className="bi bi-link-45deg"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-1 px-2"
          onClick={() => executeCmd('removeFormat')}
          title="Clear Formatting"
        >
          <i className="bi bi-eraser"></i>
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        className="form-control border-0 p-3"
        style={{
          minHeight,
          maxHeight: '400px',
          overflowY: 'auto',
          backgroundColor: '#FCFAF7',
          color: '#24160F',
          outline: 'none',
          boxShadow: 'none',
          lineHeight: '1.6',
          fontSize: '0.95rem'
        }}
        onInput={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
}
