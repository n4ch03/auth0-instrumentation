module.exports = function(pkg, env) {
  if (!env.METRICS_API_KEY) {
    return require('./stubs').metrics;
  }

  var utils = require('./utils');

  process.env.DATADOG_API_KEY = env.METRICS_API_KEY;
  var metrics = require('datadog-metrics');
  metrics.init({
    host: env.METRICS_HOST || require('os').hostname(),
    prefix: env.METRICS_PREFIX || (pkg.name + '.'),
    flushIntervalSeconds: env.METRICS_FLUSH_INTERVAL || 15
  });

  var obj = {
    isActive: true,
    __defaultTags: []
  };

  var getTags = function(tags) {
    return obj.__defaultTags.concat(utils.processTags(tags));
  };

  obj.setDefaultTags = function(tags) {
    obj.__defaultTags = utils.processTags(tags);
  };

  obj.gauge = function(name, value, tags) {
    return metrics.gauge(name, value, getTags(tags));
  };

  obj.increment = function(name, value, tags) {
    if (Array.isArray(value)) {
      tags = value;
      value = 1;
    }
    return metrics.increment(name, value, getTags(tags));
  };

  obj.histogram = function(name, value, tags) {
    return metrics.histogram(name, value, getTags(tags));
  };

  obj.flush = metrics.flush;


  if (env.COLLECT_RESOURCE_USAGE) {
    var pusage = require('pidusage');

    setInterval(function() {
      pusage.stat(process.pid, function(err, stat) {
        if (err) return;
        var tags = ['pid:' + process.pid];
        obj.gauge('resources.memory.usage', stat.memory, tags);
        obj.gauge('resources.cpu.usage', stat.cpu, tags);
      });
    }, env.COLLECT_RESOURCE_USAGE_INTERVAL || 5000);
  }

  return obj;
};
