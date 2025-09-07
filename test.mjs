/**
 * test here
 */

import log from './console-common.mjs'
import {tool, isType} from './tools-common.mjs'
// const obj = {test: 'ok'}

// log.info(obj)

// import tools from './tools-common.mjs'

// console.log(tools.updateObjs(
//     {'a': 1, b: {c: 3, d: 4}},
//     {b: { d: 5}},
//     {b: { d: 2}},
//     {b: { c: 2}},
// ));

// log.MakeFont.test()
// log.print(
//     log.MakeFont.objectToFormatText({a:1, b:2}, {use_indent: false})
// )
// log.print(
//     log.MakeFont.objectToFormatText(['a', 'b', 'c'], {use_indent: false})
// )

// log.print(log.MakeFont.valueToFormatText([1, [2, 3, 4, [5]]]))
function func() { console.log('function is this') }

const obj = {
    a: 1, b: 2, c: { d: 3, e: 4 }, f: 5, g: 6, h: { i: 7, j: { k: 8 }, l: 'is top' },
    function: () => { console.log('ok') },
    function_keyword: func, 
    method: console.log, 
    uf: undefined,
    nl: null,
    bt: true,
    bf: false,
    class: {
        error: new Error('test')
    }
} 


// console.time('calc style')
// console.log(obj)
// console.timeEnd('calc style')

// log.hr()

// console.time('my calc style')
// log.print(log.MakeFont.valueToFormatText(obj, {'use_indent': true, 'show_type_detail': true}))
// console.timeEnd('my calc style')

// log.print(log.MakeFont.valueToFormatText({a: 1, b: 2}))


// const tf = log.makeModuleLog('test')
// tf('ok')

// log.debug('tt', 1234, new Error('a'))

// log.print(111, `x`.repeat(1000))

// log.debug('type is', tool.typeOf(new Error())) // test objet

// log.info(log.MakeFont.makeStringWrapper([])('aa'))

// log.print(isType.string(0))