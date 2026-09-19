/**
 * Runs an example of docs/snippets in the browser, for the live demos of examples.md, so each demo
 * is exactly the code the page shows. The page names the example in `data-example`; this script
 * compiles it with Babel (TypeScript, JSX, decorators) and, for a `.vue` file, the Vue SFC
 * compiler, both from a CDN, and mounts it into the page. Nothing is built ahead of time.
 */
(function () {
  var CDN = "https://cdn.jsdelivr.net/npm/";
  var example = document.currentScript.dataset.example;

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
    },
  });
  document.head.appendChild(script);

  var styles = document.createElement("link");
  styles.rel = "stylesheet";
  styles.href = "../styles.css";
  document.head.appendChild(styles);

  var fail = function (error) {
    document.body.textContent = "Could not load the demo: " + error.message;
  };

  var read = function (name) {
    return fetch("../" + name).then(function (response) {
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

  var transpile = function (code, filename) {
    return window.Babel.transform(code, {
      filename: filename,
      presets: [["typescript", { allExtensions: true, isTSX: /\.tsx$/.test(filename) }], ["react", { runtime: "automatic" }]],
      plugins: [["proposal-decorators", { legacy: true }]],
    }).code;
  };

  var toModule = function (code) {
    return URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  };

  var compileVue = function (source) {
    return import(CDN + "@vue/compiler-sfc@3.5.43/dist/compiler-sfc.esm-browser.js").then(function (sfc) {
      var descriptor = sfc.parse(source, { filename: example }).descriptor;
      return sfc.compileScript(descriptor, { id: "example", inlineTemplate: true }).content;
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

  Promise.all([loadBabel, read(example)])
    .then(function (files) {
      return /\.vue$/.test(example) ? compileVue(files[1]) : files[1];
    })
    .then(function (code) {
      // Angular's JIT compiler has to be evaluated before any other Angular package, the example
      // included: the partially compiled packages look for it as they load.
      return /\.ts$/.test(example) ? import("@angular/compiler").then(function () { return code; }) : code;
    })
    .then(function (code) {
      return import(toModule(transpile(code, example.replace(/\.vue$/, ".ts"))));
    })
    .then(mount)
    .catch(fail);
})();
