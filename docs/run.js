/*
 * "Run" buttons for the guide pages (docs/guides, docs/pt-br/guides).
 *
 * A docsify plugin: after a guide page renders, every code block that is a complete example (an
 * `html` document, or a `jsx`/`tsx`/`vue` block with a default export) gets a Run button. Clicking
 * it compiles the block in the page (JSX through sucrase, a single-file component through
 * @vue/compiler-sfc, both loaded on demand from the CDN) and runs the result in a sandboxed iframe
 * under the block, with an import map that resolves the bare imports (`react`, `vue`, `zod`,
 * `valibot` and the package itself) to the CDN.
 *
 * `window.$docsify.run` overrides the CDN URLs (`importMap`, `sucrase`, `compilerSfc`), which is
 * how the local test runs the examples against copies of the modules.
 */
(function () {
  var DEFAULTS = {
    importMap: {
      '@brazilian-utils/brazilian-utils': 'https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm',
      react: 'https://cdn.jsdelivr.net/npm/react@19.3.0/+esm',
      'react/jsx-runtime': 'https://cdn.jsdelivr.net/npm/react@19.3.0/jsx-runtime/+esm',
      'react-dom/client': 'https://cdn.jsdelivr.net/npm/react-dom@19.3.0/client/+esm',
      vue: 'https://cdn.jsdelivr.net/npm/vue@3.5.43/dist/vue.esm-browser.prod.js',
      zod: 'https://cdn.jsdelivr.net/npm/zod@4/+esm',
      valibot: 'https://cdn.jsdelivr.net/npm/valibot@1/+esm',
    },
    sucrase: 'https://cdn.jsdelivr.net/npm/sucrase@3.35.1/+esm',
    compilerSfc: 'https://cdn.jsdelivr.net/npm/@vue/compiler-sfc@3.5.43/dist/compiler-sfc.esm-browser.js',
  };

  var TEXT = {
    '/': { run: 'Run', close: 'Close', running: 'Running...', title: 'Run this example in the page' },
    '/pt-br/': { run: 'Executar', close: 'Fechar', running: 'Executando...', title: 'Executa este exemplo na página' },
  };

  /** The base style of the sandbox, so a form reads the same in every example. */
  var FRAME_CSS =
    'body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:12px;color:#222;background:#fff}' +
    'label{display:block;margin:0 0 10px}input{display:block;width:100%;max-width:320px;box-sizing:border-box;' +
    'margin:4px 0;padding:6px 8px;font:inherit;border:1px solid #bbb;border-radius:4px}' +
    'small{display:block;color:#b00020}button{padding:6px 14px;font:inherit}pre{background:#f4f4f4;padding:8px;' +
    'overflow:auto}dt{font-weight:600;margin-top:8px}dd{margin:0}.run-error{color:#b00020;white-space:pre-wrap}';

  /** The script every sandbox starts with: error reporting and the height of the page. */
  var FRAME_BOOT =
    'window.__report=function(e){var p=document.createElement("pre");p.className="run-error";' +
    'p.textContent=String(e&&e.stack||e);document.body.appendChild(p)};' +
    'window.addEventListener("error",function(e){__report(e.error||e.message)});' +
    'window.addEventListener("unhandledrejection",function(e){__report(e.reason)});' +
    'new ResizeObserver(function(){parent.postMessage({runHeight:document.documentElement.scrollHeight},"*")})' +
    '.observe(document.documentElement);';

  var config = Object.assign({}, DEFAULTS, window.$docsify.run || {});
  config.importMap = Object.assign({}, DEFAULTS.importMap, (window.$docsify.run || {}).importMap || {});

  var loaders = {};

  /** Loads a module from the CDN once and caches the promise. */
  function load(url) {
    if (!loaders[url]) loaders[url] = import(/* webpackIgnore: true */ url);
    return loaders[url];
  }

  function escapeScript(code) {
    return code.replace(/<\/script/gi, '<\\/script');
  }

  function moduleUrl(code) {
    return 'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(code)));
  }

  function importMapTag(extra) {
    return '<script type="importmap">' + JSON.stringify({ imports: Object.assign({}, config.importMap, extra || {}) }) + '</script>';
  }

  function document_(body, head) {
    return '<!doctype html><html><head><meta charset="utf-8">' + (head || '') + '<style>' + FRAME_CSS + '</style>' +
      '<script>' + FRAME_BOOT + '</script></head><body>' + body + '</body></html>';
  }

  /** A React example: JSX compiled by sucrase, the default export mounted on #app. */
  function reactDocument(code) {
    return load(config.sucrase).then(function (sucrase) {
      var js = sucrase.transform(code, { transforms: ['jsx', 'typescript'], jsxRuntime: 'automatic', production: true }).code;
      var boot =
        'try {' +
        'const [{ createElement }, { createRoot }, mod] = await Promise.all([import("react"), import("react-dom/client"), import(' + JSON.stringify(moduleUrl(js)) + ')]);' +
        'createRoot(document.getElementById("app")).render(createElement(mod.default));' +
        '} catch (error) { __report(error); }';
      return document_('<div id="app"></div><script type="module">' + escapeScript(boot) + '</script>', importMapTag());
    });
  }

  /** A Vue example: the single-file component compiled by @vue/compiler-sfc and mounted on #app. */
  function vueDocument(code) {
    return load(config.compilerSfc).then(function (sfc) {
      var parsed = sfc.parse(code, { filename: 'Example.vue' });
      if (parsed.errors.length) throw parsed.errors[0];
      var descriptor = parsed.descriptor;
      var id = 'example';
      var js;
      if (descriptor.scriptSetup) {
        // <script setup>: the template is compiled into the component's own render function.
        js = sfc.compileScript(descriptor, { id: id, inlineTemplate: true, genDefaultAs: '__sfc__' }).content;
      } else {
        js = descriptor.script
          ? sfc.compileScript(descriptor, { id: id, genDefaultAs: '__sfc__' }).content
          : 'const __sfc__ = {};';
        if (descriptor.template) {
          var template = sfc.compileTemplate({ source: descriptor.template.content, filename: 'Example.vue', id: id });
          if (template.errors.length) throw template.errors[0];
          js += '\n' + template.code.replace(/\bexport function render\b/, 'function render') + '\n__sfc__.render = render;';
        }
      }
      js += '\nexport default __sfc__;';
      var css = descriptor.styles.map(function (style) { return style.content; }).join('\n');
      var boot =
        'try {' +
        'const [{ createApp }, mod] = await Promise.all([import("vue"), import(' + JSON.stringify(moduleUrl(js)) + ')]);' +
        'createApp(mod.default).mount("#app");' +
        '} catch (error) { __report(error); }';
      return document_('<div id="app"></div><script type="module">' + escapeScript(boot) + '</script>', importMapTag() + '<style>' + css + '</style>');
    });
  }

  /** An HTML example: run as it is, with the configured import map merged over its own. */
  function htmlDocument(code) {
    var own = /<script type="importmap">([\s\S]*?)<\/script>/i.exec(code);
    var imports = {};
    if (own) {
      try { imports = JSON.parse(own[1]).imports || {}; } catch (error) { imports = {}; }
    }
    // The configured entries win over the document's own (that is how the local test redirects
    // the CDN), so the document's map is replaced by the merged one.
    var map = '<script type="importmap">' + JSON.stringify({ imports: Object.assign({}, imports, config.importMap) }) + '</script>';
    var html = own ? code.replace(own[0], '') : code;
    var boot = '<script>' + FRAME_BOOT + '</script><style>' + FRAME_CSS + '</style>';
    if (/<head[^>]*>/i.test(html)) return Promise.resolve(html.replace(/<head[^>]*>/i, function (head) { return head + map + boot; }));
    if (/<body[^>]*>/i.test(html)) return Promise.resolve(html.replace(/<body[^>]*>/i, function (body) { return map + boot + body; }));
    return Promise.resolve(document_(html, map));
  }

  function isRunnable(pre, code) {
    var lang = pre.getAttribute('data-lang') || '';
    if (lang === 'html') return /<!doctype html|<html[\s>]/i.test(code);
    if (lang === 'jsx' || lang === 'tsx') return /export default/.test(code);
    if (lang === 'vue') return /<template[\s>]/i.test(code);
    return false;
  }

  function compile(lang, code) {
    if (lang === 'html') return htmlDocument(code);
    if (lang === 'vue') return vueDocument(code);
    return reactDocument(code);
  }

  function addButton(pre, text) {
    var code = pre.querySelector('code');
    if (!code || pre.querySelector('.run-button')) return;
    var source = code.textContent;
    if (!isRunnable(pre, source)) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'run-button';
    button.textContent = text.run;
    button.title = text.title;
    pre.appendChild(button);

    var frame = null;
    var wrapper = null;

    function close() {
      if (wrapper) wrapper.remove();
      wrapper = null;
      frame = null;
      button.textContent = text.run;
      button.disabled = false;
    }

    button.addEventListener('click', function () {
      if (wrapper) return close();
      button.disabled = true;
      button.textContent = text.running;
      compile(pre.getAttribute('data-lang'), source).then(function (html) {
        wrapper = document.createElement('div');
        wrapper.className = 'run-output';
        frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-scripts allow-forms');
        frame.setAttribute('title', text.run);
        frame.srcdoc = html;
        wrapper.appendChild(frame);
        pre.parentNode.insertBefore(wrapper, pre.nextSibling);
        button.textContent = text.close;
        button.disabled = false;
        var current = frame;
        window.addEventListener('message', function onMessage(event) {
          if (current !== frame) return window.removeEventListener('message', onMessage);
          if (event.source !== current.contentWindow || !event.data || !event.data.runHeight) return;
          current.style.height = Math.min(Math.max(event.data.runHeight + 4, 80), 800) + 'px';
        });
      }, function (error) {
        wrapper = document.createElement('div');
        wrapper.className = 'run-output';
        var pre_ = document.createElement('pre');
        pre_.className = 'run-error';
        pre_.textContent = String(error && error.message || error);
        wrapper.appendChild(pre_);
        pre.parentNode.insertBefore(wrapper, pre.nextSibling);
        button.textContent = text.close;
        button.disabled = false;
      });
    });
  }

  var STYLE =
    '.markdown-section pre .run-button{position:absolute;right:0;bottom:0;z-index:1;border:0;border-radius:4px 0 0 0;' +
    'background:var(--theme-color,#009739);color:#fff;font:inherit;font-size:.85em;padding:.4em .9em;cursor:pointer;opacity:.85}' +
    '.markdown-section pre .run-button:hover,.markdown-section pre .run-button:focus{opacity:1}' +
    '.markdown-section pre .run-button:disabled{opacity:.6;cursor:wait}' +
    '.markdown-section .run-output{margin:-16px 0 24px;border:1px solid var(--border-color,#ddd);border-top:0;border-radius:0 0 4px 4px}' +
    '.markdown-section .run-output iframe{display:block;width:100%;height:120px;border:0;background:#fff}' +
    '.markdown-section .run-output .run-error{margin:0;color:#b00020;white-space:pre-wrap}';

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(function (hook, vm) {
    hook.mounted(function () {
      var style = document.createElement('style');
      style.textContent = STYLE;
      document.head.appendChild(style);
    });
    hook.doneEach(function () {
      var path = vm.route.path || '';
      if (path.indexOf('/guides/') === -1) return;
      var text = TEXT[path.indexOf('/pt-br/') === 0 ? '/pt-br/' : '/'];
      var blocks = document.querySelectorAll('.markdown-section pre[data-lang]');
      for (var i = 0; i < blocks.length; i++) addButton(blocks[i], text);
    });
  });
})();
