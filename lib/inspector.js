#!/usr/bin/env node

const { spawn, exec } = require('child_process')

const pipeOptions = [ 'pipe', 'inherit', 'pipe' ]
const copy = str => exec(`echo ${JSON.stringify(str)} | xclip -sel clip`)
const between = (pattern, fn) => str => {
  const beginIdx = str.indexOf(pattern)

  return (beginIdx === -1) ? undefined : (fn && fn(str.slice(beginIdx)), true)
}

module.exports = ({ stdin, args, logError, exit }) => {
  const node = spawn('node', ['--inspect'].concat(args), { stdio: pipeOptions })
  let _url = ''

  const matches = [
    between('chrome-devtools', url => _url || copy(_url = url)),
    between('To start debugging, open'),
    between('Debugger listening on'),
    between('Warning: This is an experimental feature'),
    logError,
  ]

  stdin.setRawMode(true)
  stdin.on('data', char => {
    switch (char[0]) {
      case 4: // ctrl + c or ctrl + d
      case 3: return exit()
      case 99: { // character c
        copy(_url)
        return logError('url copied to clipboard')
      }
    }
  })

  node.on('exit', exit)
  node.stderr.on('data', buf => buf.toString()
    .split('\n')
    .filter(Boolean)
    .forEach(str => matches.reduce((stop, fn) => stop || fn(str), false)))
}