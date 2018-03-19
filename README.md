# html-webpack-simple-inlinesource-plugin
Enhances  html-webpack-plugin functionality  with inline js or css to html

## Basic Usage

 * Add the plugin to your webpack config as follows:

  ```
    plugins: [
      new HtmlWebpackPlugin(),
      new htmlWebpackSimpleInlinesourcePlugin()
    ]  
  ```

  the plugin must be created after HtmlWebpackPlugin.

 * in html

  ```

  <link href="<%=htmlWebpackPlugin.files.css[css] %>" rel="stylesheet" data-source-inline="1">

    <script src="../common/lib/zepto.min.js" data-source-inline="1" ></script>

    <script src="https://cdn.bootcss.com/jquery/3.3.1/core.js" data-source-inline="1" data-minify="1"></script>

  ```
# Configuration

* `data-source-inline`: indicate the resource(etc: css or js) must be inlined to html

* `data-minify`: only be used in script tag, indicating that the js file must be minified
