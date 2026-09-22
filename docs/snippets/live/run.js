/**
 * Runs an example of docs/snippets in the browser, so a live demo is exactly the code its page
 * shows. One page serves every demo, `live/index.html`, told what to run by its query string:
 * `?dir=<folder>&example=<component>&usage=<the file that uses it>` compiles both (Babel for
 * TypeScript and JSX, the Vue SFC compiler for a single-file component, TypeScript itself for
 * Angular, each from a CDN) and mounts the usage; `?page=<file>` runs a plain HTML example as it
 * is. Nothing is built ahead of time.
 */
(function () {
  var CDN = "https://cdn.jsdelivr.net/npm/";
  var data = Object.fromEntries(new URLSearchParams(location.search));
  var example = data.example;

  var script = document.createElement("script");
  script.type = "importmap";
  script.textContent = JSON.stringify({
    imports: {
      "@brazilian-utils/brazilian-utils": CDN + "@brazilian-utils/brazilian-utils/+esm",
      "@brazilian-utils/brazilian-utils/get-states": CDN + "@brazilian-utils/brazilian-utils/get-states/+esm",
      "@brazilian-utils/brazilian-utils/get-cities": CDN + "@brazilian-utils/brazilian-utils/get-cities/+esm",
      // esm.sh, not jsDelivr, for React: jsDelivr's react-dom imports its own copy of react.
      react: "https://esm.sh/react@19.3.0",
      "react/jsx-runtime": "https://esm.sh/react@19.3.0/jsx-runtime",
      "react-dom/client": "https://esm.sh/react-dom@19.3.0/client?deps=react@19.3.0",
      vue: CDN + "vue@3.5.43/dist/vue.esm-browser.prod.js",
      "@angular/core": CDN + "@angular/core@22.1.7/+esm",
      "@angular/compiler": CDN + "@angular/compiler@22.1.7/+esm",
      "@angular/platform-browser": CDN + "@angular/platform-browser@22.1.7/+esm",
      "@angular/forms": CDN + "@angular/forms@22.1.7/+esm",
      "@angular/core/rxjs-interop": CDN + "@angular/core@22.1.7/rxjs-interop/+esm",
      rxjs: CDN + "rxjs@7.8.2/+esm",
      "react-hook-form": "https://esm.sh/react-hook-form@7.88.0?external=react",
      "vee-validate": "https://esm.sh/vee-validate@4.15.1?external=vue",
    },
  });
  document.head.appendChild(script);

  var styles = document.createElement("link");
  styles.rel = "stylesheet";
  styles.href = "../styles.css";
  document.head.appendChild(styles);

  // A plain HTML example is its own page: its markup and its module scripts run here as they are.
  var runPage = function (html) {
    var page = new DOMParser().parseFromString(html, "text/html");
    var base = document.createElement("base");

    base.href = new URL("../" + data.page, location.href).href;
    document.head.appendChild(base);
    document.body.innerHTML = page.body.innerHTML;

    for (var script of page.querySelectorAll("script")) {
      var copy = document.createElement("script");
      copy.type = script.type;
      copy.textContent = script.textContent;
      document.body.appendChild(copy);
    }
  };

  // The page that embeds a demo cannot see how tall it is until it renders, and it keeps changing
  // as a validation message comes and goes, so the demo reports its own height.
  var reportHeight = function () {
    var height = Math.ceil(document.body.scrollHeight);

    parent.postMessage({ type: "example-height", height: height }, location.origin);
  };

  var watchHeight = function () {
    new ResizeObserver(reportHeight).observe(document.body);
    reportHeight();
  };

  if (document.readyState === "loading") {
    addEventListener("DOMContentLoaded", watchHeight);
  } else {
    watchHeight();
  }

  var fail = function (error) {
    document.body.textContent = "Could not load the demo: " + error.message;
  };

  var read = function (name) {
    return fetch("../" + (data.dir ? data.dir + "/" : "") + name).then(function (response) {
      if (!response.ok) throw new Error(name + ": HTTP " + response.status);
      return response.text();
    });
  };

  // An import of "./mask" is a file whose extension the example leaves out.
  // An import without an extension tries these in turn.
  var EXTENSIONS = [".ts", ".tsx", ".vue", ".js"];

  var find = function (name, index) {
    var attempt = index || 0;

    if (/\.(tsx?|vue|js)$/.test(name)) {
      return read(name).then(function (code) {
        return { name: name, code: code };
      });
    }

    return read(name + EXTENSIONS[attempt]).then(
      function (code) {
        return { name: name + EXTENSIONS[attempt], code: code };
      },
      function (error) {
        if (attempt + 1 >= EXTENSIONS.length) throw error;
        return find(name, attempt + 1);
      },
    );
  };

  var RELATIVE_IMPORT = /from\s*"\.\/([^"]+)"/g;
  var modules = {};

  // A file of the example and, before it, whatever it imports from beside it: each one becomes a
  // module of its own, so an example is read the way it is written.
  var moduleOf = function (name) {
    if (!modules[name]) {
      modules[name] = find(name)
        .then(function (file) {
          return compile(file.name, file.code);
        })
        .then(function (js) {
          var imports = [];
          var match;

          while ((match = RELATIVE_IMPORT.exec(js)) !== null) imports.push(match[1]);

          return Promise.all(
            imports.map(function (imported) {
              return moduleOf(imported).then(function (url) {
                js = js.split('"./' + imported + '"').join('"' + url + '"');
              });
            }),
          ).then(function () {
            return toModule(js);
          });
        });
    }

    return modules[name];
  };

  var loadBabel = new Promise(function (resolve, reject) {
    var babel = document.createElement("script");
    babel.src = CDN + "@babel/standalone@7.29.9/babel.min.js";
    babel.onload = resolve;
    babel.onerror = function () {
      reject(new Error("Babel did not load"));
    };
    document.head.appendChild(babel);
  });

  // Angular's JIT compiler reads the decorators TypeScript emits, which Babel does not reproduce,
  // so an Angular file goes through TypeScript itself.
  var transpileTypeScript = function (code, filename) {
    return import(CDN + "typescript@5.9.3/+esm").then(function (ts) {
      return ts.default.transpileModule(code, {
        fileName: filename,
        compilerOptions: {
          target: ts.default.ScriptTarget.ES2022,
          module: ts.default.ModuleKind.ESNext,
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
      }).outputText;
    });
  };

  var transpile = function (code, filename) {
    return window.Babel.transform(code, {
      filename: filename,
      presets: [["typescript", { allExtensions: true, isTSX: /\.tsx$/.test(filename) }], ["react", { runtime: "automatic" }]],
      // Class properties after the decorators, or Angular's signal inputs never register.
      plugins: [
        ["proposal-decorators", { legacy: true }],
        ["proposal-class-properties", { loose: true }],
      ],
    }).code;
  };

  var toModule = function (code) {
    return URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  };

  var compileVue = function (name, source) {
    return import(CDN + "@vue/compiler-sfc@3.5.43/dist/compiler-sfc.esm-browser.js").then(function (sfc) {
      var descriptor = sfc.parse(source, { filename: name }).descriptor;
      return sfc.compileScript(descriptor, { id: name, inlineTemplate: true }).content;
    });
  };

  // A file of the example: TypeScript, JSX or a single-file component, compiled to a module.
  var compile = function (name, code) {
    if (/\.ts$/.test(name)) return transpileTypeScript(code, name);

    var source = /\.vue$/.test(name) ? compileVue(name, code) : Promise.resolve(code);

    return source.then(function (js) {
      return transpile(js, name.replace(/\.vue$/, ".ts"));
    });
  };

  // React and Vue want an element to mount into. It takes no part in the layout, so that an
  // example lays its rows out against the page the way the Angular one does.
  var host = function () {
    var element = document.body.appendChild(document.createElement("div"));
    element.style.display = "contents";
    return element;
  };

  var mount = function (module) {
    if (/\.tsx$/.test(example)) {
      return Promise.all([import("react"), import("react-dom/client")]).then(function (react) {
        // The example is a controlled component: the demo is the parent that holds its value.
        var Demo = function () {
          var state = react[0].useState("");
          return react[0].createElement(Object.values(module)[0], { value: state[0], onChange: state[1] });
        };
        react[1].createRoot(host()).render(react[0].createElement(Demo));
      });
    }

    if (/\.vue$/.test(example)) {
      return import("vue").then(function (vue) {
        vue.createApp(module.default).mount(host());
      });
    }

    return Promise.all([import("@angular/core"), import("@angular/platform-browser")]).then(function (angular) {
      var component = Object.values(module)[0];
      document.body.appendChild(document.createElement(angular[0].reflectComponentType(component).selector));
      return angular[1].bootstrapApplication(component, {
        providers: [angular[0].provideZonelessChangeDetection()],
      });
    });
  };

  if (data.page) {
    read(data.page).then(runPage).catch(fail);
    return;
  }

  loadBabel
    .then(function () {
      // Angular's JIT compiler has to be evaluated before any other Angular package, the example
      // included: the partially compiled packages look for it as they load.
      return /\.ts$/.test(example) ? import("@angular/compiler") : undefined;
    })
    .then(function () {
      return moduleOf(data.usage || example);
    })
    .then(function (url) {
      return import(url);
    })
    .then(mount)
    .catch(fail);
})();
