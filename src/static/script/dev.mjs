import {Dom} from './common.mjs'

const dom = new Dom()
console.log(dom.selectElements({
    root: '#main',
    r1: {
        e0: '.e0',
        e1: '.e1'
    }
}))