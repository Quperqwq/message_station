import Fs, { readSync } from 'fs'
import {tool, isType} from './tools-common.mjs'
import Path from 'path'


const version = 'v250820_QUPR'

/*
下一步可以试着实现行数显示



*/

// debug def
const print = tool.print.bind(tool)


/**
 * 用于创建文本样式
 * @typedef {'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray' | 'normal' | 'unset'} FontColor
 */
class TextStyle {
    /**
     * 创建一个文本效果
     * @param {Object} param0
     * @param {{[x: string]: string}} param0.font_colors 
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

    /**值对应的字体颜色 */
    static value_colors = {
        string: 'green',
        number: 'yellow',
        boolean: 'blue',
        null: 'gray',
        undefined: 'gray',
        object: 'magenta',
        array: 'cyan',
        function: 'magenta'
    }

    /**复杂值类型 */
    static complex_value_type = ['object', 'array'] 
    
    /**简单值类型 */
    static simple_value_type = ['string', 'boolean', 'number', 'null', 'function']

    /**一元类型 */
    static unary_value_type = ['null', 'undefined']

    /**objectToFormatText 允许的数据类型 */
    ott_supported_type = ['array', 'object']
    
    /**
     * @typedef {[FontColor, FontColor]} ColorConfigArray 字体颜色配置数组
     * @typedef {FontColor | ColorConfigArray} ColorConfig 字体颜色配置
     */
    /**
     * 创建一个有颜色的文本
     * @param {string} text 
     * @param {ColorConfig} color
     * @param {FontColor} background_color 背景颜色描述词(从 `this.background_colors` 中获取)
     */
    createTextColor(text, color = 'unset', background_color = 'unset', { use_space = false } = {}) {
        let curr_text = text
        const color_code = this.getColorCode(color, background_color)
        if (use_space) curr_text = ` ${curr_text} `
        return textStyle.composeTextColor(curr_text, color_code)
    }

    /**
     * 尝试从缓存中获取彩色字体, 若不存在将会自动生成并加入缓存
     * @param {string} text 
     * @param {ColorConfigArray} color
     */
    getTextColor(text, color = ['unset', 'unset']) {
        const color_index = `${text}_${color.join('_')}`
        const cache = this.char_cache[color_index]

        if (cache) return cache

        const result = this.createTextColor(text, color)
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
     * @param {FontColor} color_name 
     */
    getFontColorCode(color_name) {
        return TextStyle.font_colors[color_name] || TextStyle.font_colors.normal
    }

    /**
     * 获取ansi颜色代码, 支持背景颜色
     * @param {FontColor | [FontColor, FontColor]} color 字体颜色描述词(从 `this.font_colors` 中获取); 若指定为数组, 则第一个元素为字体颜色, 第二个元素为背景颜色
     * @param {FontColor} background_color 背景颜色描述词(从 `this.background_colors` 中获取)
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
     * @param {FontColor} color_name 
     */
    getBackColorCode(color_name) {
        return TextStyle.background_colors[color_name] || TextStyle.background_colors.normal
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
     * 格式化`object`时进行指定操作
     * @param {object} obj 
     * @param {(key: string, value: any, index: number, is_one_last: boolean) => string} handler 
     * @returns {string}
     */
    objectProcessFormat(obj, handler) {
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
        return this.objectProcessFormat(obj, (key, value, _, is_one_last) => {
            return `${key}: ${value}${is_one_last ? '' : ','}`
        })
    }

    /**
     * @template [ T_top = undefined ]
     * @typedef {Object} ValueFormatConfig 将值转换为标准字符方法的配置对象
     * @property {T_top} show_type_detail 控制是否描述该对象的详细信息
     * @property {boolean} use_indent 控制是否使用行缩进, 若指定为否将忽略`indent_*`的一切配置
     * @property {string} space_style 留空样式
     * @property {string} indent_style 缩进样式
     * @property {number} _nesting 当前函数递归的深度
     * @property {boolean} _in_object 当前值是否在Object内; 如果是, 那么将不会显示普通值详情 
     */

    /**
     * 将对象转换为格式化的字符形式
     * @param {any} obj 
     * @param {ValueFormatConfig} format_context 
     */
    objectToFormatText(obj, format_context = {}) {
        // step.init - 此处不直接在传参部分使用解构, 因在出现递归情况(对象内有对象)这些参数需要传递以实现统一的输出行为; 此format_config可以理解为上下文
        const { _nesting = 1, use_indent = true, indent_style = '   ' } = format_context


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
            '{': is_array ? this.getTextColor('[', ['blue']) : this.getTextColor('{', ['yellow']),
            '}': is_array ? this.getTextColor(']', ['blue']) : this.getTextColor('}', ['yellow']),
            // '[': this.getTextColor('[', ['blue']),
            // ']': this.getTextColor(']', ['blue']),
            ',': this.getTextColor(',', ['gray']),
            ':': this.getTextColor(':', ['gray']),
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
        const content = this.objectProcessFormat(obj, (curr_key, curr_value, _, is_one_last) => {
            // 使用模板字符串生成
            return `${start_cont}${this.createTextColor(curr_key, 'green')}${char[':']} ${this.valueToFormatText(curr_value, format_context)}${is_one_last ? '' : split_cont}`
        })


        // step.end - 组合并返回结果
        return `${char['{']}${content}${end_cont}${char['}']}`
    }

    // /**
    //  * 格式化`Array`时进行指定操作
    //  * @param {any[]} array 
    //  * @param {(index: number, value: any) => string} handler 
    //  */
    // arrayProcessFormat(array, handler) {
    //     let result = ''
    //     array.forEach((value, index) => {
    //         result += handler(value, index)
    //     })
    //     return result
    // }

    // arrayToFormatText(array, {  }) {

    // }

    /**
     * 对任意值进行指定操作
     * @param {any} value 
     * @param {(value: any, type: string) => string} handler 
     */
    valueProcessFormat(value, handler) {
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
        const { show_type_detail = true, _nesting = 0, _in_object = false } = format_context

        const { value_colors } = TextStyle

        return this.valueProcessFormat(value, (curr_value, curr_type) => {
            if (curr_type === 'string' && !_in_object) return curr_value
            // 初始化
            const curr_color = value_colors[curr_type]
            const curr_text = String(curr_value)
            let result = ''
            let detail = {}

            // 通过类型渲染颜色
            if (TextStyle.complex_value_type.includes(curr_type) && this.ott_supported_type.includes(curr_type)) {
                // 处理对象
                const nesting = _nesting + 1
                
                result = this.objectToFormatText(value, {
                    ...format_context,
                    _in_object: true,
                    _nesting: nesting
                })

            } else {
                // 处理普通类型
                result = this.createTextColor(curr_text, curr_color)

                if (!_in_object) return result
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
                        
                    default:
                        break
                }

                const detail_text = Object.keys(detail).length ? '<' + this.objectToLineText(detail) + '> ' : ' '

                result = `${this.createTextColor(curr_type + detail_text, 'gray')}${result}`
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


const textStyle = new TextStyle()

/**
 * 构建一个输出日志类, 用于将日志信息输出到控制台或日志文件
 */
class OutputLog {
    /**
     * @typedef {{name: string, color: string | [string, string], out: function(string): void, level: number, output: function(...string): void}} LogLevelObject
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
     *  }
     * }}
     * ~(TAG)输出对象预处理
     */
    _level = {
        content: {
            3: {
                name: 'ERROR',
                color: 'red',
                out: (c) => { console.error(c) },
                level: 3
            },
            2: {
                name: 'WARN',
                color: 'yellow',
                out: (c) => { console.warn(c) },
                level: 2
            },
            1: {
                name: 'INFO',
                color: '',
                out: (c) => { console.info(c) },
                level: 1
            },
            0: {
                name: 'DEBUG',
                color: 'gray',
                out: (c) => { console.debug(c) },
                level: 0
            },
            'req': {
                name: 'Request',
                color: 'blue',
                out: (c) => { console.log(c) },
                level: 1
            }
        },
        'alias': {
            error: 3,
            warn: 2,
            info: 1,
            debug: 0,
            '-1': 'req'
        }
    }


    /**输出宽度 */
    console_width = 10

    /**
     * 
     * @param {Object} param0
     * @param {boolean} param0.use_color_code 当启用, 将日志内容打印在控制台时会进行颜色渲染
     * @param {boolean} param0.use_date_output 当启用, 将在打印日志的同时显示打印时间
     * @param {boolean} param0.write_log_file 当启用, 会将日志内容写入进日志文件
     * @param {string[] | null} param0.log_type_filter 当启用, 将只输出指定类型的日志
     * @param {number} param0.write_level 设置写入日志文件最低等级
     * @param {number} param0.show_level 设置输出的日志最低等级
     * @param {string} param0.log_path 设置输出日志的路径
     */
    constructor({use_color_code = true, use_date_output = true, write_log_file = true, show_level = 0, write_level = 2, log_type_filter = null, log_path = './log'}) {
        if (!tool.isDir(log_path)) {
            // 这里无需catch
            Fs.mkdirSync(log_path)
        }



        // -- init values -- start

        /**使用此类来创建控制台打印的彩色字体 */
        this.MakeFont = textStyle

        this.getDate = tool.makeFormatDateStr('[year]-[month]-[day] [hours]:[minutes]:[seconds].[milliseconds]')

        // 控制输出行为
        this.use_color = use_color_code
        this.use_date = use_date_output
        this.use_write = write_log_file
        this.log_path = log_path

        this.level_log = show_level
        this.level_write = write_level

        // 为便打印日志使用
        OutputLog._next_log_hours = -1
        
        // -- init values -- end




        // ~(TAG)输出对象预处理
        const { _level } = this

        const level_alias = _level['alias']
        const result_level = {
            ..._level.content,
        }

        // 对每个日志等级进行处理
        Object.keys(result_level).forEach((level_name) => {
            const level = result_level[level_name]
            const { color, name, level: level_of } = level
            level.color = textStyle.getFontColorCode(color)
            level.output = this.makeOutputFunction({
                level: level_of,
                use_header: true,
                print_full_time: true,
                header_cont: name,
                header_style: ['[', ']'],
                header_color_code: level.color,
                type: 'log'
            })
            // console.log(level);
            // console.log('function of', level.output.toString());
            

            result_level[level_name] = level
        })

        // 将别名转换为实际的日志等级
        Object.keys(level_alias).forEach((alias) => {
            const proxy_name = level_alias[alias]
            const proxy = result_level[proxy_name]
            if (!proxy) return
            result_level[alias] = proxy
        })

        /**
         * 日志等级对象
         * @type {LogLevelObjects}
         */
        this.level = result_level

    }


    /**
     * 创建一个输出处理器
     * @param {Object} param0 
     * @param {boolean} [param0.use_header=true] 是否使用header输出, 当启用时会在每次输出内容前增加定义的输出格式, 以`header_*`和`subheader_*`的参数将可用
     * @param {string} [param0.header_cont=''] 指定header的内容
     * @param {string[]} [param0.header_style=['[', ']']] 指定包裹header的样式
     * @param {string} [param0.header_color_code=''] 
     * @param {string} [param0.subheader_cont=''] 
     * @param {string} [param0.subheader_color_code=''] 
     * @param {boolean} [param0.forced_use_date=true] 
     * @param {number} [param0.level=0] 
     * @param {string} [param0.type='default'] 
     * @param {boolean} [param0.print_full_time=false] 
     * @param {boolean} [param0.use_value_detail=false] 
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
        type = 'default',

        // switch
        print_full_time = false,
        // use_value_high_light = true,
        use_value_detail = false
    }) {
        // 未到达日志等级不输出
        // console.log(`${this.level_log} > ${level}`, this.level_log > level);
        if (this.level_log > level) return () => {}

        let header_len = 0
        let header = ''
        
        if (use_header) {
            // make header
            

            // header += `${
            //     header_style[0] || '['
            // }${
            //     typeof(header_cont) === 'string' ?
            //     header_cont : 'unknown'
            // }${
            //     header_style[1] || ']'
            // }` // like '[INFO] ', '<app> '

            header += textStyle.wrapString(header_cont, header_style)
            header_len = header.length

            if (print_full_time) header_len += 26

            // set color
            if (this.use_color) {
                header = textStyle.composeTextColor(header, header_color_code)
            }
        }


        const joinValues = use_value_detail ?
        (...values) => { // 值普通实现
            return values.map((value) => {
                return this.toStr(value)
            }).join(' ')
        } : (...values) => { // 值详情实现
            return textStyle.valuesToFormatText({space_style: ' '}, ...values)
        }


        // 从这里传入需要打印的参数: `...cont`
        const compose = (...cont) => {
            const content = joinValues(...cont)
            const text = [header, content]

            if (print_full_time) {
                text.unshift(textStyle.createTextColor(this.getDate(), 'gray'))
            }
            
            return text.join(' ').replaceAll('\n', `\n${' '.repeat(header_len - 1)}`)
        }

        

        return (...cont) => {
            if (!print_full_time) this.printDate({forced_output: forced_use_date})
            this.print(compose(...cont))
        }
    }


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
                this.print(textStyle.createTextColor(`\n--- ${date} ---`, 'yellow', 'gray'))
            }
            //? header += `${time} |`
        }
    }


    // 日志输出部分
    // /**
    //  * 输出日志
    //  * @param {number | string} level 输出日志等级
    //  * @param {...string} content 输出日志内容
    //  * 
    //  * @returns {string} 待打印的内容
    //  */
    // output(level, ...content) {
    //     this.printDate() // 打印当前时间
    //     const cont = content.map((value) => { // 将参数归一化为字符
    //         return this.toStr(value)
    //     }).join(' ')


            

    //     // ~(ADD)待完全实现
    //     // const level_obj = level === -1 ? this.level['req'] : this.level[level]
    //     // create header
    //     const level_obj = this.level[level]
    //     let header = ''
    //     header += `[${
    //         typeof(level_obj?.name) === 'string' ?
    //         level_obj.name : 'unknown'
    //     }]`
    //     const header_len = header.length

    //     // set color
    //     if (this.use_color) {
    //         header = colorText.composeTextColor(header, level_obj?.color)
    //     }
        
    //     // compose
    //     let text = `${header} ${cont}`
        
    //     text = text.replaceAll('\n', `\n${' '.repeat(header_len)}`)

    //     if (level_obj) {
    //         level_obj.out(text)
    //     }
        


    //     if (this.use_write && level >= this.level_write) {
    //         // ~(ADD)目标格式 log_path[ <date>.log, ... ]
    //         // ~(TAG)日志文件写入
    //         // ~(TEMP)
    //         tool.writeFile(Path.join(this.log_path, 'running.log'), text + '\n', true)
            
    //     }

    // }

    /**
     * 输出日志
     * @param {number | string} level 输出日志等级
     * @param {...string} cont 输出日志内容
     * 
     * @returns {string} 待打印的内容
     */
    output(level, ...cont) {
        const level_obj = this.level[level]
        
        level_obj.output(...cont)
    }
    

    error(...cont) {
        this.output(3, ...cont)
        return new Error(cont)
    }
    warn(...cont) { this.output(2, ...cont) }
    info(...cont) { this.output(1, ...cont) }
    debug(...cont) { this.output(0, ...cont) }
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
        this.output(-1, cont)
    }
    /**普通的输出模式 */
    print(...cont) {
        console.log(
            this.MakeFont.valuesToFormatText({}, ...cont)
        )
    }

    printLevel(level, ...cont) {
        if (this.level_log > level) return
        this.print(...cont)
    }


    /**
     * 在控制台打印彩色字体
     * @typedef {[[text: string], [font_color: string], [background_color]]} ColorTextConfig 彩色字体配置
     * @param  {...ColorTextConfig} text_configs 颜色配置
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
     * 配置输出彩色字体
     * @param  {...ColorTextConfig | string} text_configs 
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
}


class ModuleLog {
    // ~(last)打印应用信息
    constructor(module_name = 'Default') {
        this.output = log.makeOutputFunction({
            'header_cont': module_name,
            'header_style': ['<', '>'],
            'print_full_time': true,
            'header_color_code': this.MakeFont.getColorCode('green'),
        })

    }


}

const log = new OutputLog({
    // 在这里配置输出策略
    show_level: 0
})


export default log


// test code here...

// log.debug(colorText.blue('Hello World', 'white'))

log.printColored(
    [' <console-common> ', 'white', 'cyan'],
    [` ${version} `, 'white', 'gray'],
    [' loaded ', 'white', 'green'],
    ' ',
    [import.meta.url, 'gray'],
    '\n    L ',
    ['available output level methods of:', 'green'],
    '\n    L ',
    Object.keys(log.level).join(', ')
)

// log.info(tool.Timer.end('t'))


// log.warn('text is ok\nand test break line')
// tool.Timer.start('t')
// setTimeout(() => {
//     console.log('finish timer:', tool.Timer.end('t'));
// }, 1000)
