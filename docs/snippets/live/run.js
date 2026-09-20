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
      // esm.sh, not jsDelivr, for React: jsDelivr's react-dom imports its own copy of react.
      react: "https://esm.sh/react@19.3.0",
      "react/jsx-runtime": "https://esm.sh/react@19.3.0/jsx-runtime",
      "react-dom/client": "https://esm.sh/react-dom@19.3.0/client?deps=react@19.3.0",
      vue: CDN + "vue@3.5.43/dist/vue.esm-browser.prod.js",
      "@angular/core": CDN + "@angular/core@22.1.7/+esm",
      "@angular/compiler": CDN + "@angular/compiler@22.1.7/+esm",
      "@angular/platform-browser": CDN + "@angular/platform-browser@22.1.7/+esm",
      "@angular/forms": CDN + "@angular/forms@22.1.7/+esm",
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

    document.body.innerHTML = page.body.innerHTML;

    for (var script of page.querySelectorAll("script")) {
      var copy = document.createElement("script");
      copy.type = script.type;
      copy.textContent = script.textContent;
      document.body.appendChild(copy);
    }
  };

  var fail = function (error) {
    document.body.textContent = "Could not load the demo: " + error.message;
  };

  var read = function (name) {
    return fetch("../" + (data.dir ? data.dir + "/" : "") + name).then(function (response) {
      if (!response.ok) throw new Error(name + ": HTTP " + response.status);
      return response.text();
    });
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

  var mount = function (module) {
    if (/\.tsx$/.test(example)) {
      return Promise.all([import("react"), import("react-dom/client")]).then(function (react) {
        // The example is a controlled component: the demo is the parent that holds its value.
        var Demo = function () {
          var state = react[0].useState("");
          return react[0].createElement(Object.values(module)[0], { value: state[0], onChange: state[1] });
        };
        var root = document.body.appendChild(document.createElement("div"));
        react[1].createRoot(root).render(react[0].createElement(Demo));
      });
    }

    if (/\.vue$/.test(example)) {
      return import("vue").then(function (vue) {
        vue.createApp(module.default).mount(document.body.appendChild(document.createElement("div")));
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

  Promise.all([loadBabel, read(example), data.usage ? read(data.usage) : ""])
    .then(function (files) {
      // Angular's JIT compiler has to be evaluated before any other Angular package, the example
      // included: the partially compiled packages look for it as they load.
      var angular = /\.ts$/.test(example) ? import("@angular/compiler") : Promise.resolve();

      return angular.then(function () {
        return Promise.all([compile(example, files[1]), data.usage ? compile(data.usage, files[2]) : ""]);
      });
    })
    .then(function (compiled) {
      if (!data.usage) return import(toModule(compiled[0]));

      // The usage imports the component beside it; that import becomes the compiled module.
      var component = toModule(compiled[0]);
      var pattern = new RegExp("([\"'])\\./" + example.replace(/\.\w+$/, "") + "(\\.vue)?\\1", "g");

      return import(toModule(compiled[1].replace(pattern, '"' + component + '"')));
    })
    .then(mount)
    .catch(fail);
})();
