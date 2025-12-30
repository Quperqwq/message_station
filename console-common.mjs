import Fs, { readSync } from 'fs'
import {tool, isType} from './tools-common.mjs'

// -- log level --
const LOG_LEVEL_DEBUG = 0
const LOG_LEVEL_INFO = 1
const LOG_LEVEL_WARN = 2
const LOG_LEVEL_ERROR = 3
const LOG_LEVEL_REQ = 22
const LOG_LEVEL_PLAIN = 89
const LOG_LEVEL_IMP = 99

const version = 'v250820_QUPR'

/*
下一步可以试着实现行数显示



*/


/**
 * 用于创建文本样式
 * @typedef {'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray' | 'normal' | 'unset'} Colors
 */


/**
 * @typedef {[text: string, font_color: Colors, background_color: Colors]} TextColorConfig 彩色字体配置
 */

/** 
 * @template [ T_NumberExist = undefined | number ]
 * @typedef {Object} TextTypesetConfig 文本排版配置对象
 * @property {T_NumberExist} padding_left 左间距
 * @property {T_NumberExist} padding_right 右间距
 * @property {T_NumberExist} padding_top 上间距
 * @property {T_NumberExist} padding_bottom 下间距
 * @property {T_NumberExist} padding_lr 左右间距
 * @property {T_NumberExist} padding_tb 上下间距
 * 
 * @property {T_NumberExist} margin_left 左距离
 * @property {T_NumberExist} margin_right 右距离
 * @property {T_NumberExist} margin_top 上距离
 * @property {T_NumberExist} margin_bottom 下距离
 * @property {T_NumberExist} margin_lr 左右距离
 * @property {T_NumberExist} margin_tb 上下距离
 * 
 * @property {T_NumberExist} curr_indent 当前缩进大小
 * @property {Boolean} [center] 居中
 * 
 * @typedef {[TextColorConfig | string, void | TextTypesetConfig]} TextStyleConfig 字体综合配置
 */


class TextStyle {
    /**
     * 创建一个文本效果
     * @param {Object} param0
     * @param {{[x: string]: string}} param0.font_colors 
     * @param {boolean} param0.use_color 是否打印颜色
     */
    constructor({font_colors = TextStyle.font_colors, use_color = true} = {}) {
        /**是否启用控制台颜色, 若否将会不使用颜色转义符 */
        this.enable = Boolean(use_color)

        /**字符内容缓存 @type {{[x: string]: string}} */
        this.char_cache = {}

        // 动态创建字体颜色函数为`this.color_name(text, background_color = '')`
        Object.keys(font_colors).forEach((font_color) => {
            this[font_color] = (text, background_color = '') => {
                return this.createTextColor(text, font_color, background_color)
            }
        })

        if (!this.enable) this.getColorCode = () => { return '' } 
    }


    // 颜色属性
    static style_reset = '\x1b[49m\x1b[0m' // ?

    static font_colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        gray: '\x1b[90m',
        normal: '\x1b[0m',
        unset: '',
    }

    static background_colors = {
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
        gray: '\x1b[100m',
        normal: '\x1b[49m',
        unset: '',
    }

    //  @type {{[x: string]: [color_name: Colors]}}
    // ~(last)对应class的颜色
    /**值对应的字体颜色 */
    static type_colors_map = {
        string: 'green',
        number: 'yellow',
        boolean: 'blue',
        null: 'yellow',
        undefined: 'gray',
        object: 'yellow',
        array: 'cyan',
        function: 'magenta'
    }

    // static warp_colors_map = {

    // }

    /**复杂值类型 */
    static complex_value_type = ['object', 'array'] 

    /**objectToFormatText 允许的数据类型 */
    ott_supported_type = ['array', 'object']
    
    /**简单值类型 */
    static simple_value_type = ['string', 'boolean', 'number', 'null', 'function']

    /**一元类型 */
    static unary_value_type = ['null', 'undefined']


    /**默认的文本排版配置对象 @type {TextTypesetConfig<number>} */
    #default_typeset_config = {
        center: false,
        curr_indent: 0,

        padding_left: 0,
        padding_right: 0,
        padding_top: 0,
        padding_bottom: 0,
        padding_lr: 0,
        padding_tb: 0,

        margin_left: 0,
        margin_right: 0,
        margin_top: 0,
        margin_bottom: 0,
        margin_lr: 0,
        margin_tb: 0,
        
    }
    
    /**
     * @typedef {[font_color: Colors, back_color: Colors]} ColorConfigArray 字体颜色配置数组
     * @typedef {Colors | ColorConfigArray} ColorConfig 字体颜色配置
     */



    // -- color --

    /**
     * 创建一个能被控制台响应彩色字体的对象
     * @param {string} text 
     * @param {ColorConfig} color
     * @param {Colors} background_color 背景颜色描述词(从 `this.background_colors` 中获取)
     */
    createTextColor(text, color = 'unset', background_color = 'unset', { use_space = false } = {}) {
        let curr_text = text
        const color_code = this.getColorCode(color, background_color)
        if (use_space) curr_text = ` ${curr_text} `
        return this.composeTextColor(curr_text, color_code)
    }

    /**
     * 尝试从缓存中获取彩色字体, 若不存在将会自动生成并加入缓存
     * @param {string} text 
     * @param {ColorConfigArray} font_color
     */
    getTextColor(text, font_color = 'unset', background_color = 'unset') {
        const color_index = `${text}_${font_color}_${background_color}`
        const cache = this.char_cache[color_index]

        if (cache) return cache

        const result = this.createTextColor(text, font_color, background_color)
        this.char_cache[color_index] = result
        return result
    }

    /**
     * 用颜色ansi代码组合一个字体颜色, 自动闭合为默认字体
     * @param {string} text 
     * @param {string} ansi_color_code 
     */
    composeTextColor(text, ansi_color_code) {
        return ansi_color_code ? `${ansi_color_code}${text}${TextStyle.style_reset}` : text
    }

    /**
     * 获取字体颜色ansi代码
     * @param {Colors} color_name 
     */
    getFontColorCode(color_name) {
        return TextStyle.font_colors[color_name] || TextStyle.font_colors.normal
    }

    /**
     * 获取ansi颜色代码, 支持背景颜色
     * @param {Colors | [Colors, Colors]} color 字体颜色描述词(从 `this.font_colors` 中获取); 若指定为数组, 则第一个元素为字体颜色, 第二个元素为背景颜色
     * @param {Colors} background_color 背景颜色描述词(从 `this.background_colors` 中获取)
     * 
    */
    getColorCode(color, background_color = 'unset') {
        let font_color = ''
        let back_color = ''
        if (Array.isArray(color)) {
            font_color = color[0]
            back_color = color[1] || ''
        } else {
            font_color = color
            back_color = background_color || ''
        }

        return `${
            this.getFontColorCode(font_color)
        }${
            back_color ?
            this.getBackColorCode(back_color) : ''
        }`
    
    }

    /**
     * 获取背景颜色的ansi代码
     * @param {Colors} color_name 
     */
    getBackColorCode(color_name) {
        return TextStyle.background_colors[color_name] || TextStyle.background_colors.normal
    }



    //  * @param {string | TextColorConfig} text_setter 文本颜色配置(`TextColorConfig`)对象或文本(`string`); 若指定`string`将会默认原色
    //  * @param {TextTypesetConfig} param1 字体配置对象

    // -- typeset --

    /**
     * 获取一个指定长度的空格字符串
     * @param {number} length >0 的合法数字
     * @returns {string}
     */
    getSpaceStr(length = 1) {
        const len = +length
        return ' '.repeat(len > 0 ? len : 0)
    }

    /**
     * 处理排版配置, 转换为合法对象
     * @param {TextTypesetConfig} text_config 
     * @returns {TextTypesetConfig<number>}
     */
    processTypesetTextConfig(text_config) {
        const default_config = this.#default_typeset_config
        Object.keys(default_config).forEach((key) => {
            text_config[key] ||= default_config[key] ?? void 0
            const value = text_config[key]

            // 值默认或无效时不进行下一步
            if (!value) return

            // 将复合值转换为对应值
            // [ margin / padding ]_[ lr / tb ] -> [ margin / padding ]_[ left / right / top ... ]
            switch (key) {
                case 'margin_lr':
                    text_config.margin_left ||= value
                    text_config.margin_right ||= value
                    break
                case 'margin_tb':
                    text_config.margin_top ||= value
                    text_config.margin_bottom ||= value
                    break
                case 'padding_lr':
                    text_config.padding_left ||= value
                    text_config.padding_right ||= value
                    break
                case 'padding_tb':
                    text_config.padding_top ||= value
                    text_config.padding_bottom ||= value
                    break
            }

            return
        })

        return text_config
    }

    /**
     * 创建一个排版后可以在控制台输出的文本
     * @param {...TextStyleConfig} text_configs
     */
    createStyleTexts(...text_configs) {
        /**
         * 每一行的每一节内容
         * @type {string[][]}
         * ```js
         * [
         *  ['content 1', 'content 2'],                 // line 1
         *  ['content 1', 'content 2', 'content 3'],    // line 2
         *  // and more lines ...
         * ]
         * ```
         */
        const lines = [[]]

        /**
         * 往`lines`内插入一节内容
         * ```text
         * [
         *  [
         *    'content x', <here>
         *  ],
         *  [
         *    'content x', <here>
         *  ],
         * ]
         * ```
         * @param {string[]} contents 
         */
        const insetContent = (contents) => {
            contents.forEach((text, curr_line) => {
                // 确保二维数组已初始化
                lines[curr_line] ||= []

                // 插入当前内容
                lines[curr_line].push(text)
            })
        }
        
        // 处理每个文本配置
        //    行   |节1        |节2        |节3
        // ------------------------------------------
        // line 1: content 1  | content 2 | content 3
        // line 2: content 1  | content 2 | content 3
        // line 3: content 1  | content 2 | content 3
        // and more line...
        //
        // padding: 包含背景颜色的间隙
        // margin: 不含背景颜色的间隙
        // center: 使最终内容居中(`lines`)
        //
        text_configs.forEach((text_config) => {
            /**当前节的内容 @type {string[]} */
            const curr_content = []
            const color_config = text_config[0]
            const typeset_config = this.processTypesetTextConfig(text_config[1])
            // ~(last)继续完成字体排版处理方法
            for (const key in typeset_config) {
                /**@type {keyof TextTypesetConfig} */
                const typeset_name = key
                switch (typeset_name) {
                    case 'padding_left':
                        
                    case 'padding_right':
                    case 'padding_top':
                    case 'padding_bottom':
                    case 'padding_lr':
                    case 'padding_tb':
                    case 'margin_left':
                    case 'margin_right':
                    case 'margin_top':
                    case 'margin_bottom':
                    case 'margin_lr':
                    case 'margin_tb':
                    case 'curr_indent':
                    case 'center':
                }

            }
        })
    }




    // wrapper

    /**@typedef {string[]} WrapperConfig 指定包装字符 */
    /**
     * 创建一个包裹文本生成器
     * @param {WrapperConfig} wrapper 
     * @example
     * makeStringWrapper(['<', '>'])('xxx') // => '<xxx>'
     */
    makeStringWrapper(wrapper = [], _default = ['(', ')']) {
        if ((wrapper?.length < 1) && (_default?.length < 2)) return (text) => {return text}
        return (text) => {
            return `${wrapper[0] || _default[0]}${text}${wrapper[1] || _default[1]}`
        }
    }
    /**
     * 生成一个被指定字符包裹的字符
     * @param {string} text 
     * @param {WrapperConfig} wrapper
     */
    wrapString(text, wrapper) {
        return this.makeStringWrapper(wrapper)(text)
    }

    /**
     * 生成一个被指定多个字符包裹的字符
     * @param {string} text 
     * @param {WrapperConfig} wrapper
     */
    wrapStrings(wrapper, ...text) {
        return this.makeStringWrapper(wrapper)(text.join(''))
    }



    // toFormatText ...

    /**
     * 对`object`进行指定操作
     * @param {object} obj 
     * @param {(key: string, value: any, index: number, is_one_last: boolean) => string} handler 
     * @returns {string}
     */
    processObject(obj, handler) {
        let result = []
        const keys = Object.keys(obj)
        const max_index = keys.length - 1 // 最大下标

        for (const index in keys) {
            const curr_key = keys[index]

            result.push(handler(
                curr_key,
                obj[curr_key],
                index,
                max_index <= index // 传入是否为最后一个元素
            ))
            
        }

        return result.join('')
    }

    objectToLineText(obj) {
        return this.processObject(obj, (key, value, _, is_one_last) => {
            return `${key}: ${value}${is_one_last ? '' : ','}`
        })
    }

    /**
     * @template [ T_top = undefined ]
     * @typedef {Object} ValueFormatConfig 将值转换为标准字符方法的配置对象
     * @property {T_top} show_type_detail 控制是否描述该对象的详细信息(仅在对象为`Object`时可用)
     * @property {boolean} use_indent 控制是否使用行缩进, 若指定为否将忽略`indent_*`的一切配置
     * @property {string} space_style 留空样式
     * @property {string} indent_style 缩进样式
     * @property {boolean} [use_colored=true] 是否启用颜色渲染
     * @property {boolean} [use_detail=true] 是否启用值详细描述
     * @property {string} [_curr_type] 当前处理对象的类型
     * @property {Colors} [_curr_color] 当前处理对象类型对应的颜色
     * @property {number} _nesting 当前函数递归的深度
     * @property {boolean} _in_object 当前值是否在Object内; 如果是, 那么将不会显示普通值详情 
     * @property {string[]} [detail_warp_style=['<', '>']] 显示对象详细信息时包裹的样式
     * @property {Colors} [detail_warp_color='gray'] 显示对象详细信息时的颜色
     */

    /**
     * 将对象转换为格式化的字符形式
     * @param {any} obj 
     * @param {ValueFormatConfig} format_context 
     */
    objectToFormatText(obj, format_context = {}) {
        // like:
        // {x: 1, y: 2}
        // 
        // {
        //      x: 1,
        //      y: 2
        // }

        // step.init - 此处不直接在传参部分使用解构, 因在出现递归情况(对象内有对象)这些参数需要传递以实现统一的输出行为; 此format_config可以理解为上下文
        const { _nesting = 1, use_indent = true, indent_style = '   ', _curr_color = 'yellow' } = format_context


        // step.init - function

        /**
         * 生成一个缩进字符
         * @param {number} depth 当前对象深度
         */
        const indent = (depth = 1) => {
            return indent_style.repeat(depth)
        }

        // step.init - value

        // 确认当前操作对象是否为特殊的对象(数组)
        const is_array = Array.isArray(obj)

        // 初始化排版样式
        let start_cont = ' '
        let end_cont = ' '
        let split_cont = ' '

        // step.1 - 计算样式
        // 固有字符样式
        const char = {
            start: is_array ? this.getTextColor('[', 'blue') : this.getTextColor('{', _curr_color),
            end: is_array ? this.getTextColor(']', 'blue') : this.getTextColor('}', _curr_color),
            // '[': this.getTextColor('[', ['blue']),
            // ']': this.getTextColor(']', ['blue']),
            ',': this.getTextColor(',', 'gray'),
            ':': this.getTextColor(':', 'gray'),
        }

        // 缩进样式
        if (use_indent) {
            start_cont = `\n${indent(_nesting)}`
            end_cont = `\n${indent(_nesting - 1)}`
            split_cont = char[',']
        } else {
            split_cont = char[',']
        }
        
        
        // step.2 - 生成格式化的内容
        const content = this.processObject(obj, (curr_key, curr_value, _, is_one_last) => {
            // 使用模板字符串生成
            return `${start_cont}${this.createTextColor(curr_key, 'green')}${char[':']} ${this.valueToFormatText(curr_value, format_context)}${is_one_last ? '' : split_cont}`
        })


        // step.end - 组合并返回结果
        return `${char.start}${content}${end_cont}${char.end}`
    }


    // ~(last)将`valueToFormatText`解耦如下两个函数并应用
    valueToDetail() {

    }

    // /**
    //  * 自动匹配值类型并渲染颜色
    //  * @param {any} value 
    //  * @returns {string}
    //  */
    // valueToColored(value) {
    //     const { type_colors_map } = TextStyle
    //     return this.createTextColor(type_colors_map[typeof(value)] || '')
    // }

    /**
     * 对任意值进行指定操作
     * @param {any} value 
     * @param {(value: any, type: string) => string} handler 
     */
    valueFormatProcess(value, handler) {
        const type = tool.typeOf(value)
        return handler(value, type)
    }

    /**
     * 对任意值进行格式化操作
     * @param {any} value 
     * @param {ValueFormatConfig<boolean>} format_context 
     * @returns 
     */
    valueToFormatText(value, format_context = {}) {
        // 该函数因涉及到深度遍历对象内容, 所以可能在处理`Object`时会递归调用
        // 
        // string, number, ...  简单类型直接渲染颜色后输出
        // Array, Object, ...   复杂类型将会深度遍历所有值并计算输出
        // 
        const {
            show_type_detail = true,
            // ~(last)use this
            use_colored = true,
            use_detail = false, _nesting = 0,
            _in_object = false,
            detail_warp_style = ['<', '>'],
            detail_warp_color = 'gray'
        } = format_context

        const { type_colors_map: value_colors } = TextStyle

        return this.valueFormatProcess(value, (curr_value, curr_type) => {
            if (curr_type === 'string' && !(_in_object || use_detail)) return curr_value

            // 初始化
            /**对象类型对应的颜色 @type {Colors} */
            const curr_color = value_colors[curr_type] || 'normal'
            const curr_text = String(curr_value)
            let result = ''
            let detail = {}

            // 通过类型渲染颜色
            // 判断是否为复杂对象(将会二次处理后输出)
            if (TextStyle.complex_value_type.includes(curr_type) && this.ott_supported_type.includes(curr_type)) {
                // 处理对象
                const nesting = _nesting + 1
                
                // 将对象转换为待输出的样式
                result = this.objectToFormatText(value, {
                    ...format_context,
                    _in_object: true,
                    _nesting: nesting,
                    // _curr_type: curr_type,
                    _curr_color: curr_color
                })

            } else {
                // 处理普通类型
                result = this.createTextColor(curr_text, curr_color)

                // 当不在对象内或不需要显示类型详细信息时直接返回
                if (!(_in_object || use_detail)) return result
            }

            // 显示该对象详细信息
            show_detail: if (show_type_detail) {
                if (TextStyle.unary_value_type.includes(curr_type)) break show_detail // 一元类型不进行详情显示

                // ~(TAG)复杂类型的详细输出内容
                switch (curr_type) {
                    case 'array':
                        detail.length = value.length
                        break
                    case 'object':
                        detail.length = Object.keys(value).length
                        break
                    case 'class':
                        detail.class = tool.classOf(value)
                        break
                        // console.log('class', curr_type, ': ', value);
                    case 'string':
                        // ~(last)输出string时带单引号, 并进行内容转义(' -> \')
                        detail.length = value.length
                        break
                        
                    default:
                        break
                }

                // 将对象详细内容转换为最终格式
                const detail_text = Object.keys(detail).length ?
                `${detail_warp_style[0]}${this.objectToLineText(detail)}${detail_warp_style[1]}`   // like     <length: 1, ...>
                : ''                      // no detail content

                result = `${this.createTextColor(`${curr_type}${detail_text}`, 'white', 'gray')} ${result}`
            } else {
                result = this.createTextColor(`${value}`, curr_color)
            }
            return result
        })
    }

    /**
     * 对多个值进行格式化操作
     * @param {ValueFormatConfig<boolean>} format_context 
     * @param {...any} values 
     */
    valuesToFormatText(format_context = {}, ...values) {
        const { space_style = ' ' } = format_context
        const result = []

        for (const value of values) {
            result.push(this.valueToFormatText(value, format_context))
        }

        return result.join(space_style)
    }

    // valueToColorText(value, _type_of = 'object') {
    //     // step.3
    //     const value_of = _type_of || tool.typeOf(value)
    //     if (TextStyle.complex_value_of.includes(value_of)) {

    //     }

    // }

    // valueToFormatText(value) {
    //     // step.4
    // }



    test() {
        log.hr()
        log.printColored(
            'color test\n\nfont color:\n',
            ['red', 'red'], '-',
            ['green', 'green'], '-',
            ['yellow', 'yellow'], '-',
            ['blue', 'blue'], '-',
            ['magenta', 'magenta'], '-',
            ['cyan', 'cyan'], '-',
            ['white', 'white'], '-',
            ['gray', 'gray'],
            '\nbackground color:\n',
            ['red', 'white', 'red'], '-',
            ['green', 'white', 'green'], '-',
            ['yellow', 'white', 'yellow'], '-',
            ['blue', 'white', 'blue'], '-',
            ['magenta', 'white', 'magenta'], '-',
            ['cyan', 'white', 'cyan'], '-',
            ['white', 'black', 'white'], '-',
            ['gray', 'black', 'gray'], '\n'
        )
    }
}



/**
 * 构建一个输出日志类, 用于将日志信息输出到控制台或日志文件
 */
class OutputLog {
    /**
     * @typedef {Object} LogLevelObject 日志等级配置对象
     * @property {string} name 该日志等级输出的标题内容
     * @property {ColorConfig} color 输出字体颜色
     * @property {number} [level] 输出等级
     * @property {boolean} [use_plain = false] 使用明文输出, 不修饰字符
     * @property {boolean} [use_detail = false] 使用详细的类型输出, 当打印时简单类型也有详细内容
     * @property {(...print_values: string) => void} out 基本输出方法
     * @property {(...print_values: string) => void} [output] 输出方法
     * 
     * 
     * @typedef {{ [x: number | string]: LogLevelObject}} LogLevelObjects 日志对象
     */
    /**
     * 未处理的日志等级对象
     * @type {{
     *  content: {
     *      [x: number | string]: LogLevelObject, 
     *  },
     *  alias: {
     *      [x: string]: string | [string, string]
     *  } | undefined
     * }}
     * ~(TAG)输出对象预处理
     */
    _level = {
        content: {
            [LOG_LEVEL_IMP]: {
                name: 'MAIN',
                color: 'yellow',
                out: (c) => console.log(c),
                // level: 10,
            },
            [LOG_LEVEL_ERROR]: {
                name: 'ERROR',
                color: 'red',
                out: (c) => { console.error(c) },
                // level: 3
            },
            [LOG_LEVEL_WARN]: {
                name: 'WARN',
                color: 'yellow',
                out: (c) => { console.warn(c) },
                // level: 2
            },
            [LOG_LEVEL_INFO]: {
                name: 'INFO',
                color: '',
                out: (c) => { console.info(c) },
                // level: 1
            },
            [LOG_LEVEL_DEBUG]: {
                name: 'DEBUG',
                color: 'gray',
                out: (c) => { console.debug(c) },
                // level: 0
            },
            [LOG_LEVEL_REQ]: {
                name: 'Request',
                color: 'blue',
                out: (c) => { console.log(c) },
                // level: LOG_LEVEL_REQ
            },
            [LOG_LEVEL_PLAIN]: {
                name: '',
                color: '',
                out: (c) => { console.log(c) },
                use_plain: true
            },
            // [LOG_LEVEL_]: {
            //     name: '',
            //     color: '',
            //     out: (c) => {},
            // },
        },
        // 'alias': {
        //     error: 3,
        //     warn: 2,
        //     info: 1,
        //     debug: 0,
        //     '-1': 'req'
        // }
    }


    /**输出宽度 */
    console_width = 10

    /**
     * 
     * @param {Object} param0
     * @param {boolean} param0.use_console_color_code 当启用, 将日志内容打印在控制台时会进行颜色渲染
     * @param {boolean} param0.use_date_output 当启用, 将在打印日志的同时显示打印时间
     * @param {boolean} param0.write_log_file 当启用, 会将日志内容写入进日志文件
     * @param {string[] | null} param0.log_type_filter 当启用, 将只输出指定类型的日志
     * @param {number} param0.write_level 设置写入日志文件最低等级
     * @param {number} param0.show_level 设置输出的日志最低等级
     * @param {string} param0.log_path 设置输出日志的路径
     * @param {boolean} [param0.use_show_logo = true] 当启用, 该模块导入成功时将会在控制台打印提示信息
     */
    constructor({
        use_console_color_code = true,
        use_date_output = true,
        write_log_file = true,
        show_level = 0,
        write_level = 2,
        log_type_filter = null,
        log_path = './log',
        use_show_logo = true
    }) {
        if (!tool.isDir(log_path)) {
            // 这里无需catch
            Fs.mkdirSync(log_path)
        }

        // ~(last)实现filter



        // -- init values -- start

        /**使用此类来创建控制台打印的彩色字体 */
        this.MakeFont = new TextStyle({use_color: Boolean(use_console_color_code)})

        this.getDate = tool.makeFormatDateStr('[year]-[month]-[day] [hours]:[minutes]:[seconds].[milliseconds]')

        // 控制输出行为
        this.use_color = use_console_color_code
        this.use_date = use_date_output
        this.use_write = write_log_file
        /**载入完成时在控制台打印logo */
        this.use_show_logo = use_show_logo
        this.log_path = log_path

        this.level_log = show_level
        this.level_write = write_level

        // 为便打印日志使用
        OutputLog._next_log_hours = -1
        
        // -- init values -- end




        // ~(TAG)输出对象预处理
        const { _level } = this

        // const level_alias = _level['alias']
        // const result_levels = {
        //     ..._level.content,
        // }
        const result_levels = _level.content

        // 对每个日志等级进行处理
        // --------------------------------------------------------
        // name:    该等级的名称                xxx [name] content
        // color:   该等级在控制台渲染的颜色    [...] (color)
        // out:     输出方法                    (c) => [method]
        // 
        Object.keys(result_levels).forEach((level) => {
            const curr = result_levels[level]
            const { color, name } = curr
            curr.color = this.MakeFont.getFontColorCode(color)

            // 将预处理参数进行处理
            // 修改后将影响直接调用外露方法(如 this.print this.info)输出行为
            curr.output = this.makeOutputFunction({
                level: +level || curr.level || -1,
                use_header: true,               // 使用头部标签样式
                print_full_time: true,          // 打印完整时间
                header_cont: name,              // 头部标签名
                header_style: ['[', ']'],       // 指定头部标签样式
                header_color_code: curr.color,  // 打印颜色
                type: 'log',                    // 对应日志的类型, 或用于过滤日志内容
                use_plain: curr.use_plain       // 是否为明文输出
            })
            // console.log(level);
            // console.log('function of', level.output.toString());
            

            result_levels[level] = curr
        })

        // 将别名转换为实际的日志等级
        // Object.keys(level_alias).forEach((alias) => {
        //     const proxy_name = level_alias[alias]
        //     const proxy = result_levels[proxy_name]
        //     if (!proxy) return
        //     result_levels[alias] = proxy
        // })

        /**
         * 日志等级对象
         * @type {LogLevelObjects}
         */
        this.level = result_levels


        // console.log('output handler', result_levels);
        
    }


    // ~(ADD)详细注释makeOutputFunction的参数
    /**
     * 创建一个输出处理器
     * @param {Object} param0 
     * @param {boolean} [param0.use_header=true] 是否使用header输出, 当启用时会在每次输出内容前增加定义的输出格式, 以`header_*`和`subheader_*`的参数将可用
     * @param {string} [param0.header_cont=''] 指定`header`的内容
     * @param {string[]} [param0.header_style=['[', ']']] 指定包裹`header`的样式
     * @param {string} [param0.header_color_code=''] `header`的颜色代码
     * @param {string} [param0.subheader_cont=''] 子`header`的内容
     * @param {string} [param0.subheader_color_code=''] 
     * @param {boolean} [param0.forced_use_date=true] 
     * @param {number} [param0.level=0] 
     * @param {string} [param0.type='default'] 
     * @param {boolean} [param0.print_full_time=false] 
     * @param {boolean} [param0.use_value_detail=false] 
     * @param {boolean} [param0.use_plain=false] 使用明文输出
     */
    makeOutputFunction({
        // header
        use_header = true,
        header_cont = '',
        header_style = ['[', ']'],
        header_color_code = '',
        // ~(last)
        subheader_cont = '',
        subheader_color_code = '',
        

        // date
        forced_use_date = true,

        // level & type
        level = 0,
        type = 'default', // ~(TAG)指定type

        // switch
        print_full_time = false,
        // use_value_high_light = true,
        use_value_detail = false,
        use_plain = false,
    }) {
        // 未到达日志等级不输出
        // [output level limit] > level => not output
        if (this.level_log > level) return () => {}

        if (use_plain) {
            // 明文输出, 将不会进行格式化处理
            return (...cont) => {
                console.log(...cont)
            }
        }

        let header_len = 0
        let header = ''
        
        if (use_header) {
            // ... [header] ...

            header += this.MakeFont.wrapString(header_cont, header_style)
            header_len = header.length

            if (print_full_time) header_len += 26

            if (subheader_cont) {
                header += ` ${subheader_color_code}${subheader_cont}${subheader_color_code ? TextStyle.style_reset : ''} `
            }

            // set color
            if (this.use_color) {
                header = this.MakeFont.composeTextColor(header, header_color_code)
            }
        }


        const joinValues = use_value_detail ?
        (...values) => { // 值普通实现
            return values.map((value) => {
                return this.toStr(value)
            }).join(' ')
        } : (...values) => { // 值详情实现
            return this.MakeFont.valuesToFormatText({space_style: ' '}, ...values)
        }


        // 从这里传入需要打印的参数: `...cont`
        const compose = (...cont) => {
            const content = joinValues(...cont)
            const text = [header, content]

            if (print_full_time) {
                text.unshift(this.MakeFont.createTextColor(this.getDate(), 'gray'))
            }
            
            return text.join(' ').replaceAll('\n', `\n${' '.repeat(header_len - 1)}`)
        }

        

        return (...cont) => {
            if (!print_full_time) this.printDate({forced_output: forced_use_date})
            this.print(compose(...cont))
        }
    }
    
    // switch mode - method

    setOutputFilter() {}


    /**
     * 打印当前时间
     * @param {Object} [param0={}] 
     * @param {boolean} [param0.print_now=false] 即时打印
     * @param {boolean} [param0.forced_output=false] 忽略全局的output配置, 强制使用输出时间
     */
    printDate({print_now = false, forced_output = false} = {}) {
        // ~(FIX)需要新能修复
        if (this.use_date || forced_output || print_now) {
            const _date = new Date()
            const date = tool.getDate('to_hours', _date)
            const time = tool.getDate('day_minutes', _date)
            const hours = tool.getDate('hours', _date)
            const t_token = `${date}:${hours}`
            
            if ((OutputLog._next_log_hours !== t_token) || print_now) {
                OutputLog._next_log_hours = t_token
                this.print(this.MakeFont.createTextColor(`\n--- ${date} ---`, 'yellow', 'gray'))
            }
            //? header += `${time} |`
        }
    }




    // -- output area --

    /**
     * 输出日志
     * @param {number | string} level 输出日志等级
     * @param {...string} cont 输出日志内容
     * 
     * @returns {string} 待打印的内容
     */
    output(level, ...cont) {
        const level_obj = this.level[level]

        // console.log('curr output handler', level_obj)
        
        level_obj?.output(...cont)
    }
    
    imp(...cont) { this.output(LOG_LEVEL_IMP, ...cont) }
    error(...cont) {
        this.output(3, ...cont)
        return new Error(cont)
    }
    warn(...cont) { this.output(LOG_LEVEL_WARN, ...cont) }
    info(...cont) { this.output(LOG_LEVEL_INFO, ...cont) }
    debug(...cont) { this.output(LOG_LEVEL_DEBUG, ...cont) }
    /**直接打印值 */
    obj(...value) { console.log(...value) }
    hr(cont = '_') {
        const len = cont.length
        this.print(cont.repeat(Math.floor(this.console_width / len)))
    }
    /**
     * 在控制台打印一个请求信息
     * @param {Request} req 
     */
    req(req) {
        let cont = `${req.method} ${req.path}`
        this.output(LOG_LEVEL_REQ, cont)
    }

    /**明文输出到控制台 */
    plain(...args) {
        this.output(LOG_LEVEL_PLAIN, ...args)
    }

    /**普通的输出模式 */
    print(...values) {
        this.plain( this.MakeFont.valuesToFormatText({}, ...values) )
    }

    printValues(...values) {
        this.plain( this.MakeFont.valuesToFormatText({'use_detail': true}, ...values) )
    }

    printLevel(level, ...cont) {
        if (this.level_log > level) return
        this.print(...cont)
    }
    /**
     * 在控制台打印彩色字体
     * @param  {...TextColorConfig} text_configs 颜色配置
     */
    printColored(...text_configs) {
        const colored_text = this.makeColoredText(...text_configs)
        this.print(colored_text)
    }

    /**
     * 在控制台打印更多信息
     * ~(last)~(FIX)后续需要配合日志缓冲区
     */
    det(cont = '') {
        console.log('    L', cont)
    }

    // makeModuleLog(module_name) {
    //     return this.makeOutputFunction({
    //         'header_cont': module_name,
    //         'header_style': ['<', '>'],
    //         'print_full_time': true,
    //         'header_color_code': this.MakeFont.getColorCode('green'),
    //     })
    // }



    // 辅助函数
    /**
     * 将值转换为字符串形式
     * @param {any} value 
     */
    toStr(value) {
        switch (typeof (value)) {
            case 'object':
                if (Array.isArray(value)) {
                    return `[${value.join(', ')}]`
                } else {
                    return JSON.stringify(value)
                }
            case 'string':
                return value
            default:
                return `${value}`
        }
    }

    // /**
    //  * 将指转换为详细的字符形式
    //  * @param {any} value 
    //  */
    // toDetailStr(value, config_of = {}) {
    //     return this.MakeFont.valueToFormatText(value, config_of)
    // }

    /**
     * 获取一个处理后可以在控制台输出的彩色字体对象
     * @param {...TextColorConfig | string} text_configs 
     */
    makeColoredText(...text_configs) {
        // ~(TODO)实现彩色文本输出
        // 创建输出对象
        let result = ''

        // 遍历配置
        text_configs.forEach((text_config) => {
            // 如果是字符串, 则直接添加
            if (typeof text_config === 'string') {
                result = `${result}${text_config}`
                return
            }
            // 否则, 认为是一个配置数组
            result = `${result}${this.MakeFont.createTextColor(...text_config)}`
        })

        return result
    }

    /**
     * 获取一个处理后可以在控制台输出的排版后字体对象
     * @param {...TextStyleConfig} text_configs
     */
    makeTypesetText(...text_configs) {
    }
}



export const log = new OutputLog({
    // 在这里配置输出策略
    show_level: 0,
    use_color_code: true,
    use_show_logo: false,
})

export const textStyle = log.MakeFont

export class ModuleLog {
    // ~(last)打印应用信息
    constructor(module_name = 'Default') {
        this.output = log.makeOutputFunction({
            'header_cont': module_name,
            'header_style': ['<', '>'],
            'print_full_time': true,
            'header_color_code': textStyle.getColorCode('green'),
            'subheader_cont': 'test level',
            'subheader_color_code': textStyle.getColorCode('gray'),
        })

    }


}

/**快捷打印到控制台方法 */
export const print = (...args) => {
    log.print(...args)
}

/**快捷打印到控制台方法, 将会打印值的基本属性 */
export const printValues = (...values) => {
    log.printValues(...values)
}




// test code here...

// log.debug(colorText.blue('Hello World', 'white'))

if (log.use_show_logo) {
    log.printColored(
        [' <console-common> ', 'white', 'cyan'],
        [` ${version} `, 'white', 'gray'],
        [' loaded ', 'white', 'green'],
        ' ',
        [import.meta.url, 'gray'],
        // '\n    L ',
        // ['available output level methods of:', 'green'],
        // '\n    L ',
        // Object.keys(log.level).join(', ')
    )
}

// log.info(tool.Timer.end('t'))


// log.warn('text is ok\nand test break line')
// tool.Timer.start('t')
// setTimeout(() => {
//     console.log('finish timer:', tool.Timer.end('t'));
// }, 1000)
