import exp from 'constants'
import crypto from 'crypto' 
import Fs from 'fs'
import Path from 'path'

class Timer {
    constructor(time_labels = {}) {
        /**
         * 计时器列表
         * @type {{[x: string]: number}}
         */
        this.labels = time_labels
        /**当前计时器列表默认的索引值 */
        this.index = 10000
    }

    /**
     * 开始一个计时器
     * @param {string} [label] 计时器标签
     */
    start(label = String(++this.index)) {
        this.labels[label] = performance.now()
        return label
    }

    /**
     * 结束一个计时器, 并返回计时结果(单位`ms`)
     * @param {string} label 计时器标签
     */
    end(label = '') {
        let now = performance.now()
        const start_time = this.labels[label]
        if (start_time === undefined) return NaN
        now -= start_time
        delete this.labels[label]
        return now
    }
}

const timer = new Timer()

/**
 * 构建一个工具对象, 用于复用常见功能
 */
class Tools {
    /**常见的正则表达式 */
    regular = {
        /**非特殊字符 */
        not_special: /^[a-zA-Z0-9\u4e00-\u9fa5]*$/,
        /**电子邮箱 */
        email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        /**密码 */
        password: /^[a-zA-Z0-9!@#$%^&*()_+={}|[\]\\:";'<>?,./`~\-]*$/,
    }

    constructor() {
        this.Timer = timer
    }



    // -- FileSystem Method --

    /**
     * 获取目标路径状态的对象(fs.Stats)
     * @param {string} path 
     */
    fileStat(path) {
        try {
            return Fs.statSync(path)
        } catch (error) {
            return
        }
    }

    /**
     * 读取一个纯文本文件为String
     * @param {string} path 目标文件路径
     * @param {boolean} [_check_file=true] 在读取前检查文件有效性
     */
    readFileToStr(path, _check_file = true) {
        // 过滤非文件路径
        if (_check_file) {
            if (!this.isFile(path)) {
                return new Error('not_file')
            }
        }
        return Fs.readFileSync(path, 'utf-8')
    }

    /**
     * 获取目录下的所有文件名或路径
     * @param {string} path 读取目标的路径
     * @param {'path' | 'name' | 'name_no_ext'} [type='path'] 获取类型
     */
    readDir(path, type = 'path', full_path = false) {
        
        /** 输出目标样式
         * @param {string} path 
         * @param {string} filename 
         */
        const output = (() => {
            const defaultMethod = (path, filename) => {
                return Path.join(path, filename)
            }
            
            const method = {
                'path': defaultMethod,
                'name': (_, filename) => {
                    return  Path.join(filename)
                },
                'name_no_ext': (_, filename) => {
                    return Path.basename(filename, Path.extname(filename))
                }
            }[type]
            return method
            // (path, filename) => {
            //     switch (type) {
            //         case 'path':
            //             return Path.join(path, filename)
            //         case 'name':
            //             return Path.join(filename)
            //         case 'name_no_ext':
            //             return Path.basename(filename, Path.extname(filename))
            //         default:
            //             return Path.join(path, filename)
            //     }
            // }
        })() 
        
        // 判断是否合法
        if (!this.isDir(path)) {
            return new Error('invalid_path')
        }
        /**@type {string[]} */
        let result = []

        try {
            Fs.readdirSync(path).forEach((filename) => {
                result.push(output(path, filename))
            })
        } catch (error) {
            return new Error('read_dir_failed')
        }

        return full_path ? result.map((p) => {
            return Path.join(_dirname, path, p)
        }) : result
    }

    /**
     * 获取目录下的所有路径或文件列表
     * @param {string} path 目标路径
     * @param {boolean} is_file 是否获取位当前路径下的文件, 如果不是, 那么获取为目录列表
     * @returns 
     */
    readDirAs(path, is_file) {
        /**@type {string[]} */
        const result = []
        const file_list = this.readDir(path)
        if (file_list instanceof Error) return result

        file_list.forEach((file_path) => {
            const file_stat = this.fileStat(file_path)
            if (!file_stat) return
            if (this.xor(file_stat.isFile(), is_file)) result.push(file_path)
        })
        return result
    }

    /**
     * (`this.readDirAs`)读取路径下的文件
     * @param {string} path 
     */
    readDirFile(path) {
        return this.readDirAs(path, true)
    }

    /**
     * (`this.readDirAs`)读取路径下的路径
     * @param {string} path 
     */
    readDirPath(path) {
        return this.readDirAs(path, false)
    }

    /**
     * 写入String到目标文本文件
     * @param {string} path 目标文件路径
     * @param {string} content 写入内容
     * @param {boolean} add_mode 启用时, 将追加文本内容而非覆写
     */
    writeFile(path, content, add_mode) {
        if (!this.fileStat(Path.dirname(path)).isDirectory()) {
            return new Error('invalid_path')
        }
        if (add_mode) {
            Fs.appendFileSync(path, content)
        } else {
            Fs.writeFileSync(path, content)
        }

        return 'ok'
    }

    /**
     * 检查目标路径是否是文件
     * @param {string} path 目标路径
     */
    isFile(path) {
        try {
            return Fs.statSync(path).isFile()
        } catch (error) {
            return false
        }
    }

    /**
     * 检查目标路径是否是目录
     * @param {string} path 目标路径
     */
    isDir(path) {
        try {
            return Fs.statSync(path).isDirectory()
        } catch (error) {
            return false
        }
    }



    // -- Logic Method --

    /**
     * 获取一个值的类型(typeof的增强)
     * @param {any} value 
     */
    typeOf(value) {
        const type = typeof(value)
        switch (type) {
            case 'object':
                if (Array.isArray(value)) return 'array'
                if (value === null) return 'null' 
                const class_name = this.classOf(value)
                return class_name === 'object' ? class_name : 'class'
            default:
                return type
        }
    }

    /**
     * 获取一个对象的类名
     * @param {any} value 
     */
    classOf(value) {
        return String(Object.prototype.toString.call(value).slice(8, -1)).toLowerCase()
    }

    /**
     * 验证一个值是否是指定类型
     * @param {any} value 需要验证的值
     * @param {string} type 指定类型
     */
    isType(value, type = '') {
        return this.typeOf(value) === type.toLowerCase()
    }

    /**
     * 判断一个值的类型是否被允许
     * @param {any} value 需要验证的类型
     * @param {string[]} types 允许的类型
     */
    isAllowType(value, types) {
        // console.log({value, types});
        const type_of = this.typeOf(value)
        return types.includes(type_of)
    }

    /**
     * 异或门
     * @param {any} a 逻辑a
     * @param {any} b 逻辑b
     */
    xor(a, b) {
        return !((a || b) && !(a && b))
    }



    // -- string --

    /**
     * 获取可读的日期字符串 ~(FIX)需要做性能优化
     * @param {'day_time' | 'date' | 'to_hours' | 'hours'} [style] 获取的格式
     */
    getDate(style, _date_obj = new Date()) {
        const date = _date_obj
        /** @param {number[]} arr */
        const pad = (arr) => {
            arr.forEach((value, index) => {
                if (typeof(value) === 'string') return
                arr[index] = value.toString().padStart(2, '0')
            })
            return arr.join('')
        }
        let time = []
        switch (style) {
            case 'day_time':
                time = [
                    date.getHours(),
                    ':',
                    date.getMinutes(),
                    ':',
                    date.getSeconds()
                ]
                break
            case 'day_minutes':
                time = [
                    date.getMinutes(),
                    '.',
                    date.getSeconds()
                ]
                break
            case 'date':
                time = [
                    date.getFullYear(),
                    '/',
                    date.getMonth() + 1,
                    '/',
                    date.getDate()
                ]
                break
            case 'to_hours':
                time = [
                    this.getDate('date', _date_obj),
                    ' ',
                    date.getHours(),
                    ' hours'
                ]
                break
            case 'hours':
                return date.getHours()
            default:
                return date.toLocaleString()
        }
        return pad(time)
    }

    /**
     * 获取一个完整的日期对象
     */
    getFullDateObj(_date_obj = new Date()) {
        return {
            year: _date_obj.getFullYear(),
            month: _date_obj.getMonth() + 1,
            day: _date_obj.getDate(),
            hours: _date_obj.getHours(),
            minutes: _date_obj.getMinutes(),
            seconds: _date_obj.getSeconds(),
            milliseconds: _date_obj.getMilliseconds(),
        }
    }

    /**
     * 获取格式化的日期字符串
     * @param {string} format 格式化字符串, 使用 `[year]`, `[month]`, `[date]`, `[hours]`, `[minutes]`, `[seconds]` 作为占位符
     */
    getFormatDateStr(format = '[year]/[month]/[date] [hours]:[minutes]:[seconds]', _date_obj = new Date()) {
        const date = this.getFullDateObj(_date_obj)
        date.milliseconds = date.milliseconds.toString().padStart(3, '0') // 补齐毫秒数

        let result = format
        // 将格式化字符串中的日期关键字替换为实际值
        Object.keys(date).forEach((keyword) => {
            result = result.replace(`[${keyword}]`, date[keyword].toString().padStart(2, '0'))
        })

        return result
    }

    /**
     * 获取格式化的日期字符串可复用函数
     * @param {string} format 格式化字符串, 使用 `[year]`, `[month]`, `[day]`, `[hours]`, `[minutes]`, `[seconds]` 作为占位符
     */
    makeFormatDateStr(format = '[year]/[month]/[day] [hours]:[minutes]:[seconds]') {
        return (date_obj = new Date()) => {
            return this.getFormatDateStr(format, date_obj)
        }
    }

    /**
     * (string.prototype.split())切片一个字符串, 最后一个切片内容是剩余内容
     * @param {string} cont 需要切片的字符串 
     * @param {string} splitter 切片依据
     * @param {number} limit 切片后数组上限
     */
    splitStr(cont, splitter, limit = 2) {
        if (limit <= 0) return []
        const the_limit = limit - 1

        const cont_list = cont.split(splitter)
        const result = cont_list.slice(0, the_limit)
        result.push(cont_list.slice(the_limit).join(splitter))
        return result
    }

    /**
     * @typedef {'hex' | 'base64' | 'binary'} HashDigest
     * @typedef {'md5' | 'sha256' | 'sha512'} HashAlgorithm
     */
    /**
     * 对一个字符串进行哈希运算
     * @param {string} cont 将要进行哈希运算的字符串
     * @param {HashAlgorithm} algorithm 哈希运算方法
     * @param {HashDigest} [digest] 输出哈希结果编码
     */
    strToHashValue(cont, algorithm, digest = 'hex') {
        const hash = crypto.createHash(algorithm)
        hash.update(cont)
        return hash.digest(digest)
    }

    /**
     * 对一组字符串进行哈希运算输出为md5散列值
     * @param  {...string} cont 
     * @returns 
     */
    strToMd5HashValue(...cont) {
        const plain = cont.join('/')
        return this.strToHashValue(plain, 'md5', 'hex')
    }

    /**
     * 生成一个随机散列值
     * @param {HashAlgorithm} algorithm 运算方法
     * @param {HashDigest} [digest] 输出编码
     */
    getRandom(algorithm = 'md5', digest = 'hex') {
        const random = Math.random()
        const plain_text = `${random}//${new Date().getTime()}`
        return this.strToHashValue(plain_text, algorithm, digest)
    }

    /**获取当前时间戳 */
    get time() {
        return Math.floor(new Date().getTime() / 1000)
    }


    // -- Value Method --
    
    /**
     * 对于一个不信任的值(如用户传入值), 确保一个值类型有效符合预期
     * @param {any} value 需要确认的值
     * @param {string} value_type 该值应该的类型
     * @param {any} normal 若不是此类型指定为默认值
     */
    valid(value, value_type, normal) {
        const type = value_type.toLowerCase()
        if (typeof(value) === type) return value
        if (type === 'array') return Array.isArray(value) ? value : normal

        return normal
    }

    /**
     * 将返回参数值且在控制台打印该值
     * @param {any} value 
     */
    print(value) {
        console.log(value)
        return value
    }


    /**
     * 更新一个对象
     * @param {object} old_obj 原对象
     * @param {object} new_obj 新对象
     */
    updateObj(old_obj, new_obj) {
        if (!new_obj) return old_obj
        const result = {}
        for (const key in old_obj) {
            const new_value = new_obj[key]
            const old_value = old_obj[key]
            
            if ((this.typeOf(old_value) === 'object') && this.typeOf(new_value) === 'object') {
                // 当新旧值均为对象时进行递归
                result[key] = this.updateObj(old_value, new_value)
                continue
            }
            result[key] = (new_value === void 0) ? old_value : new_value
        }
        return result
    }

    /**
     * 更新一个对象, 可传入多个新值
     * @param {object} old_obj 原对象
     * @param  {...any} new_objs 新对象
     */
    updateObjs(old_obj, ...new_objs) {
        let result = old_obj
        new_objs.forEach((new_obj) => {
            result = this.updateObj(result, new_obj)
        })
        return result
    }
}

class IsType {
    constructor() {
        const type_list = ['string', 'number', 'bigint', 'boolean', 'symbol', 'undefined', 'function', 'object', 'array', 'null', 'class']

        type_list.forEach((type) => {
            this[type.toLowerCase()] = (value, return_self) => {
                const is = tool.typeOf(value) === type
                if (return_self) {
                    return is ? value : void 0
                } else {
                    return is
                }
            }
        })
    }
}




export const tool = new Tools()
export const isType = new IsType()
// export default tool