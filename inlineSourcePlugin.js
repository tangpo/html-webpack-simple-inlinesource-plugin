const cheerio =require('cheerio');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const uglifyJs = require('uglify-js');

const requestMethod = {http, https};

function HtmlWebpackInlineAnySourcePlugin (options) {
  options = options || {};
  this.outputPath = options.outputPath;
}

HtmlWebpackInlineAnySourcePlugin.prototype.apply = function (compiler) {
  let self = this;

  if (compiler.hooks) {
    // webpack 4 support
    compiler.hooks.compilation.tap('HtmlWebpackInlineAnySource', function (compilation) {
      compilation.hooks.htmlWebpackPluginAfterEmit.tapAsync('HtmlWebpackInlineAnySource', function (htmlPluginData, callback) {
        self.transform(compilation, htmlPluginData.plugin.options, htmlPluginData.outputName, callback);
      });
    });
  } else {
    // Hook into the html-webpack-plugin processing
    compiler.plugin('compilation', function (compilation) {
      compilation.plugin('html-webpack-plugin-after-emit', function (htmlPluginData, callback) {
        self.transform(compilation, htmlPluginData.plugin.options, htmlPluginData.outputName, callback);
      });
    });
  }
};

HtmlWebpackInlineAnySourcePlugin.prototype.transform = function (compilation, htmlWebpackPluginOptions, webpackHtmlFilename, callback) {
  let sourceHtml = compilation.assets[webpackHtmlFilename].source(),
     baseFilePath = htmlWebpackPluginOptions.template,
     availablePromise = [],
     transformLen;

  let loaderIdx = baseFilePath.lastIndexOf('!');

  let $ = cheerio.load(sourceHtml,{decodeEntities: false});

  baseFilePath = baseFilePath.substring(loaderIdx + 1);
  baseFilePath = path.dirname(baseFilePath);

  this.transformJs($, baseFilePath, availablePromise, compilation);
  this.transformCss($, baseFilePath, availablePromise, compilation);

  Promise.all(availablePromise).then(()=>{
    compilation.assets[webpackHtmlFilename].source = function() { return $.html()};
    callback(null);
  }).catch((err)=>{
    console.log(err);
  });

}

HtmlWebpackInlineAnySourcePlugin.prototype.transformJs = function($, baseFolder, availablePromise, compilation){

  $('script').each((idx,script)=>{
    let $target = $(script),
        src = $target.attr('src'),
        isInline = isInLine($target),
        isMini = isMinify($target);

    if(isInline){
      $target.removeAttr('src');

      availablePromise.push(getRequestSource(baseFolder, src, compilation).then((datas)=>{
        let ret = isMini ? uglifyJs.minify(datas,{
                    fromString: true,
                    output: {
                      comments: function(node, comment) {
                          var text = comment.value;
                          var type = comment.type;
                          if (type == "comment2") {
                              // multiline comment
                              return /@preserve|@license|@cc_on/i.test(text);
                          }
                      }
                    }
                  }).code : datas;

        $target.text(`\n${ret}\n`);
      }));
    }
  });
}

HtmlWebpackInlineAnySourcePlugin.prototype.transformCss = function($, baseFolder, availablePromise, compilation){
  $('link').each((idx,link)=>{
    let $target = $(link),
        href = $target.attr('href'),
        isInline = isInLine($target);

    if(isInline){
      availablePromise.push(getRequestSource(baseFolder, href, compilation).then((datas)=>{
        $target.replaceWith(`<style>\n${datas}\n</style>`);
      }));
    }
  });
}

function getRequestSource(htmlFilePath, url, compilation){
  let protocalTest = /(.*):\/\//,
      regxRet = protocalTest.exec(url);

  if(!regxRet){

    return new Promise(function(resolve, reject){
      let fileName = path.basename(url);

      if(compilation.assets[fileName])
        return resolve(compilation.assets[fileName].source());

      let requirePath = path.resolve(htmlFilePath, url);

      fs.readFile(requirePath, function (err, data) {
        if (err) {
          console.error(err);
          reject(err);
        }

        resolve(data.toString());
      });
    })
  }else{
    return getRemoteFile(url, regxRet[1]);
  }
}

function getRemoteFile(url, protocal){

  if(requestMethod[protocal]){
    return new Promise(function(resolve, reject){
      let req = requestMethod[protocal].get(url, function (res) {
        let b = [];
        res.on('data', function (c) {
          b.push(c);
        });
        res.on('end', function () {
          resolve(Buffer.concat(b).toString('utf8'));
        });
        res.on('error', reject);
      });
      req.on('error', reject);

    });
  }
}

function isInLine(dom){
  return !!(dom.attr('data-source-inline')*1);
}

function isMinify(dom){
  return !!(dom.attr('data-minify')*1);
}

module.exports = HtmlWebpackInlineAnySourcePlugin;