/*
 * "Run" buttons for the guide pages (docs/guides, docs/pt-br/guides).
 *
 * A docsify plugin: after a guide page renders, every code block that is a complete example gets a
 * Run button: an `html` document, a `jsx`/`tsx` block with a default export (React), a `vue`
 * single-file component, or a `typescript` block whose default export is an `@Component`
 * (Angular). Nothing is downloaded until the button is clicked. Then the block is compiled in the
 * page (JSX through sucrase, a single-file component through @vue/compiler-sfc, an Angular
 * component through Babel with the TypeScript preset and legacy decorators, each loaded from the
 * CDN on first use) and runs in a sandboxed iframe under the block, with an import map that
 * resolves the bare imports (`react`, `vue`, `@angular/*`, `zod`, `valibot` and the package
 * itself) to the CDN. The iframe fetches those modules only at that point.
 *
 * The versions are pinned to the latest releases at the time of writing; bump them here.
 * `window.$docsify.run` overrides the URLs (`importMap`, `sucrase`, `compilerSfc`, `babel`),
 * which is how the local test runs the examples against copies of the modules.
 */
(function () {
  var CDN = 'https://cdn.jsdelivr.net/npm/';
  var VERSIONS = {
    react: '19.3.0',
    vue: '3.5.43',
    angular: '22.1.7',
    rxjs: '7.8.2',
    zod: '4.6.5',
    valibot: '1.5.0',
    sucrase: '3.35.1',
    babel: '7.29.9',
  };

  var DEFAULTS = {
    importMap: {
      '@brazilian-utils/brazilian-utils': CDN + '@brazilian-utils/brazilian-utils/+esm',
      react: CDN + 'react@' + VERSIONS.react + '/+esm',
      'react/jsx-runtime': CDN + 'react@' + VERSIONS.react + '/jsx-runtime/+esm',
      'react-dom/client': CDN + 'react-dom@' + VERSIONS.react + '/client/+esm',
      vue: CDN + 'vue@' + VERSIONS.vue + '/dist/vue.esm-browser.prod.js',
      '@angular/core': CDN + '@angular/core@' + VERSIONS.angular + '/+esm',
      '@angular/common': CDN + '@angular/common@' + VERSIONS.angular + '/+esm',
      '@angular/forms': CDN + '@angular/forms@' + VERSIONS.angular + '/+esm',
      '@angular/platform-browser': CDN + '@angular/platform-browser@' + VERSIONS.angular + '/+esm',
      '@angular/compiler': CDN + '@angular/compiler@' + VERSIONS.angular + '/+esm',
      rxjs: CDN + 'rxjs@' + VERSIONS.rxjs + '/+esm',
      'rxjs/operators': CDN + 'rxjs@' + VERSIONS.rxjs + '/operators/+esm',
      zod: CDN + 'zod@' + VERSIONS.zod + '/+esm',
      valibot: CDN + 'valibot@' + VERSIONS.valibot + '/+esm',
    },
    sucrase: CDN + 'sucrase@' + VERSIONS.sucrase + '/+esm',
    compilerSfc: CDN + '@vue/compiler-sfc@' + VERSIONS.vue + '/dist/compiler-sfc.esm-browser.js',
    babel: CDN + '@babel/standalone@' + VERSIONS.babel + '/babel.min.js',
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

  /** Loads an ES module from the CDN once and caches the promise. */
  function load(url) {
    if (!loaders[url]) loaders[url] = import(/* webpackIgnore: true */ url);
    return loaders[url];
  }

  /** Loads a classic script (Babel standalone is one) once and resolves with the global it defines. */
  function loadScript(url, globalName) {
    if (!loaders[url]) {
      loaders[url] = new Promise(function (resolve, reject) {
        if (window[globalName]) return resolve(window[globalName]);
        var script = document.createElement('script');
        script.src = url;
        script.onload = function () { resolve(window[globalName]); };
        script.onerror = function () { reject(new Error('Could not load ' + url)); };
        document.head.appendChild(script);
      });
    }
    return loaders[url];
  }

  function escapeScript(code) {
    return code.replace(/<\/script/gi, '<\\/script');
  }

  function moduleUrl(code) {
    return 'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(code)));
  }

  function importMapTag(imports) {
    return '<script type="importmap">' + JSON.stringify({ imports: imports }) + '</script>';
  }

  function document_(body, head) {
    return '<!doctype html><html><head><meta charset="utf-8">' + (head || '') + '<style>' + FRAME_CSS + '</style>' +
      '<script>' + FRAME_BOOT + '</script></head><body>' + body + '</body></html>';
  }

  /** Wraps the boot of an example: the imports it needs and the user's module, mounted on the page. */
  function bootDocument(mount, boot, head) {
    return document_(mount + '<script type="module">try {' + escapeScript(boot) + '} catch (error) { __report(error); }</script>', importMapTag(config.importMap) + (head || ''));
  }

  /** A React example: JSX compiled by sucrase, the default export mounted on #app. */
  function reactDocument(code) {
    return load(config.sucrase).then(function (sucrase) {
      var js = sucrase.transform(code, { transforms: ['jsx', 'typescript'], jsxRuntime: 'automatic', production: true }).code;
      return bootDocument(
        '<div id="app"></div>',
        'const [{ createElement }, { createRoot }, mod] = await Promise.all([import("react"), import("react-dom/client"), import(' + JSON.stringify(moduleUrl(js)) + ')]);' +
        'createRoot(document.getElementById("app")).render(createElement(mod.default));'
      );
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
      return bootDocument(
        '<div id="app"></div>',
        'const [{ createApp }, mod] = await Promise.all([import("vue"), import(' + JSON.stringify(moduleUrl(js)) + ')]);' +
        'createApp(mod.default).mount("#app");',
        '<style>' + css + '</style>'
      );
    });
  }

  /**
   * An Angular example: TypeScript and the decorators compiled by Babel, the JIT compiler loaded
   * first, the default export bootstrapped on <app-root> (the selector every example uses).
   */
  function angularDocument(code) {
    return loadScript(config.babel, 'Babel').then(function (Babel) {
      var js = Babel.transform(code, {
        filename: 'example.ts',
        presets: [['typescript', { onlyRemoveTypeImports: false }]],
        plugins: [['proposal-decorators', { legacy: true }], ['proposal-class-properties', { loose: true }]],
      }).code;
      return bootDocument(
        '<app-root></app-root>',
        'await import("@angular/compiler");' +
        'const [{ bootstrapApplication }, mod] = await Promise.all([import("@angular/platform-browser"), import(' + JSON.stringify(moduleUrl(js)) + ')]);' +
        'await bootstrapApplication(mod.default);'
      );
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
    var map = importMapTag(Object.assign({}, imports, config.importMap));
    var html = own ? code.replace(own[0], '') : code;
    var boot = '<script>' + FRAME_BOOT + '</script><style>' + FRAME_CSS + '</style>';
    if (/<head[^>]*>/i.test(html)) return Promise.resolve(html.replace(/<head[^>]*>/i, function (head) { return head + map + boot; }));
    if (/<body[^>]*>/i.test(html)) return Promise.resolve(html.replace(/<body[^>]*>/i, function (body) { return map + boot + body; }));
    return Promise.resolve(document_(html, map));
  }

  function kindOf(pre, code) {
    var lang = pre.getAttribute('data-lang') || '';
    if (lang === 'html') return /<!doctype html|<html[\s>]/i.test(code) ? 'html' : null;
    if (lang === 'jsx' || lang === 'tsx') return /export default/.test(code) ? 'react' : null;
    if (lang === 'vue') return /<template[\s>]/i.test(code) ? 'vue' : null;
    if (lang === 'typescript' || lang === 'ts') return /@Component\(/.test(code) && /export default/.test(code) ? 'angular' : null;
    return null;
  }

  var COMPILERS = { html: htmlDocument, react: reactDocument, vue: vueDocument, angular: angularDocument };

  function addButton(pre, text) {
    var code = pre.querySelector('code');
    if (!code || pre.querySelector('.run-button')) return;
    var source = code.textContent;
    var kind = kindOf(pre, source);
    if (!kind) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'run-button';
    button.textContent = text.run;
    button.title = text.title;
    pre.appendChild(button);

    var wrapper = null;

    function open(node) {
      wrapper = document.createElement('div');
      wrapper.className = 'run-output';
      wrapper.appendChild(node);
      pre.parentNode.insertBefore(wrapper, pre.nextSibling);
      button.textContent = text.close;
      button.disabled = false;
    }

    function close() {
      if (wrapper) wrapper.remove();
      wrapper = null;
      button.textContent = text.run;
      button.disabled = false;
    }

    button.addEventListener('click', function () {
      if (wrapper) return close();
      button.disabled = true;
      button.textContent = text.running;
      COMPILERS[kind](source).then(function (html) {
        var frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-scripts allow-forms');
        frame.setAttribute('title', text.run);
        frame.srcdoc = html;
        open(frame);
        window.addEventListener('message', function onMessage(event) {
          if (!frame.isConnected) return window.removeEventListener('message', onMessage);
          if (event.source !== frame.contentWindow || !event.data || !event.data.runHeight) return;
          frame.style.height = Math.min(Math.max(event.data.runHeight + 4, 80), 800) + 'px';
        });
      }, function (error) {
        var message = document.createElement('pre');
        message.className = 'run-error';
        message.textContent = String(error && error.message || error);
        open(message);
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
