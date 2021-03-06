var Command = require('ronin').Command
var fs = require('fs')
var path = require('path')
var webshot = require('webshot')
var ipfsAPI = require('ipfs-api')
var open = require('open')

module.exports = Command.extend({
  desc: 'View or generate screenshots for your application',

  options: {
    gen: 'boolean'
  },

  run: function (gen, name) {
    try {
      var configPath = path.resolve(process.cwd() + '/ipscend.json')
      fs.statSync(configPath)
      snapshot()
    } catch (err) {
      // console.log(err)
      console.log('Project must be initiated first, run `ipscend init`')
    }

    function snapshot () {
      var config = JSON.parse(fs.readFileSync(configPath))
      if (config.versions.length === 0) {
        return console.log('You need to publish at least once with <ipscend publish>')
      }

      var ipfs = ipfsAPI('localhost', '5001')

      if (!gen) {
        ipfs.add(new Buffer(JSON.stringify(config.versions)), function (err, res) {
          if (err || !res) {
            return console.error('err', err)
          }
          var previewAppHash = 'QmaJtFXp1ft4hLznscpRjEufZLTT8YuFn82vWFPeT2rprC'
          var versionsHash = res[0].Hash
          var base = 'http://localhost:8080/ipfs/'
          open(base + previewAppHash + '/#' + versionsHash)
        })
        return
      }

      if (gen) {
        var len = config.versions.length
        config.versions.forEach(function (version) {
          if (!version.snapshot) {
            webshot('http://localhost:8080/ipfs/' + version.hash,
                '/tmp/' + version.hash + '.png', {
                  shotSize: {
                    width: 'all',
                    height: 'all'
                  }
                }, function (err) {
              if (err) {
                return console.log(err)
              }

              ipfs.add('/tmp/' + version.hash + '.png', function (err, res) {
                if (err || !res) {
                  return console.error('err', err)
                }
                version.snapshot = res[0].Hash
                len--
                if (len === 0) {
                  var fd = fs.openSync(configPath, 'w')
                  fs.writeSync(fd, JSON.stringify(config, null, '  '), 0, 'utf-8')
                }
              })
            })
          } else {
            len--
          }
        })
      }
    }
  }
})
