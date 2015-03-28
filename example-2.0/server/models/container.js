'use strict';

/**
  * @ngdoc function
  * @name loopback-component-storage:container
  * @description Add remote hooks for Model:container

	npm install archiver lodash --save

 */
var Archiver, _, factory, handler, loopback_component_storage_path, request;

_ = require('lodash');

request = require('request');

loopback_component_storage_path = "../../node_modules/loopback-component-storage/lib/";

handler = require(loopback_component_storage_path + './storage-handler');

factory = require(loopback_component_storage_path + './factory');

Archiver = require('archiver');

module.exports = function(Container) {
  Container.downloadContainer = function(container, files, res, cb) {
    var DELIM, _appendFile, _finalize, _oneComplete, _remaining, filenames, storageService, zip, zipFilename;
    zip = Archiver('zip');
    zipFilename = container + '.zip';
    console.log('attachment=' + zipFilename);
    res.attachment(zipFilename);
    zip.pipe(res);
    storageService = this;
    _remaining = {};
    _appendFile = function(zip, container, filename) {
      var reader;
      console.log('appendFile=' + filename);
      reader = storageService.downloadStream(container, filename, function(stream) {
        return console.log('storageService.downloadStream() resp=', _.keys(stream));
      });
      console.log('_appendFile, reader=', _.keys(reader));
      zip.append(reader, {
        name: filename
      });
    };
    zip.on('error', function(err) {
      console.log('zip entry error', err);
      res.status(500).send({
        error: err.message
      });
    });
    zip.on('entry', function(o) {
      return _oneComplete(o.name);
    });
    _oneComplete = function(filename) {
      delete _remaining[filename];
      console.log('_oneComplete(): ', {
        remaining: _.keys(_remaining),
        size: zip.pointer()
      });
      if (_.isEmpty(_remaining)) {
        _finalize();
      }
    };
    _finalize = function() {
      console.log('calling zip.finalize() ...');
      res.on('close', function() {
        console.log('response closed');
        return res.status(200).send('OK').end();
      });
      zip.finalize();
    };
    if (files === 'all' || _.isEmpty(files)) {
      console.log('files=', files);
      storageService.getFiles(container, function(err, ssFiles) {
        _remaining = _.object(_.pluck(ssFiles, 'name'));
        console.log('filenames=', _.keys(_remaining));
        return ssFiles.forEach(function(file) {
          _appendFile(zip, container, file.name);
        });
      });
    } else {
      DELIM = ',';
      filenames = files.split(DELIM);
      _remaining = _.object(filenames);
      console.log('filenames=', _.keys(_remaining));
      _.each(filenames, function(filename) {
        _appendFile(zip, container, filename);
      });
    }
  };
  return Container.remoteMethod('downloadContainer', {
    shared: true,
    accepts: [
      {
        arg: 'container',
        type: 'string',
        'http': {
          source: 'path'
        }
      }, {
        arg: 'files',
        type: 'string',
        required: false,
        'http': {
          source: 'path'
        }
      }, {
        arg: 'res',
        type: 'object',
        'http': {
          source: 'res'
        }
      }
    ],
    returns: [],
    http: {
      verb: 'get',
      path: '/:container/downloadContainer/:files'
    }
  });
};


