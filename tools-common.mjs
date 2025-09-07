import crypto from 'crypto' 


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

    constructor() {}



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
     * 获取一个值的类型
     * @param {any} value 
     */
    typeOf(value) {
        const type_of = typeof(value)
        switch (type_of) {
            case 'object':
                if (Array.isArray(value)) return 'array'
                if (value === null) return 'null'
                return 'object'
            default:
                return type_of
        }
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
    getDate(style, _date_obj) {
        const date = _date_obj || new Date()
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

    /**@typedef {'hex' | 'base64' | 'binary'} Digest */
    /**
     * 对一个字符串进行哈希运算
     * @param {string} cont 将要进行哈希运算的字符串
     * @param {'md5' | 'sha256' | 'sha512'} method 哈希运算方法
     * @param {Digest} [digest] 输出哈希结果编码
     */
    strToHashValue(cont, method, digest = 'hex') {
        const hash = crypto.createHash(method)
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
     * 生成一个随机值
     * @param {Digest} [digest] 输出编码
     */
    getRandom(digest = 'hex') {
        const random = Math.random()
        const plain_text = `${random}//${new Date().getTime()}`
        return this.strToHashValue(plain_text, 'md5', digest)
    }

    /**获取当前时间戳 */
    get time() {
        return Math.floor(new Date().getTime() / 1000)
    }


    // -- value --
    
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
}


const tool = new Tools()
export default tool