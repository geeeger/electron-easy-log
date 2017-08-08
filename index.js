import moment from 'moment';
import path from 'path';
import os from 'os';
import { productName } from '../package.json';
import fs from 'fs';

const LOG_LEVEL = {
    SILENT: 1,
    LOW: 2,
    HIGH: 3
};

const LOG_TYPE = {
    INFO: '[INFO]',
    WARN: '[WARN]',
    ERROR: '[ERROR]'
};

const HOME = os.homedir ? os.homedir() : process.env['HOME'];

function devLog() {
    return function (type, message) {
        let timeNow = moment().format('LLL');
        console.info(`[${timeNow}]`);
        switch(type) {
            case LOG_TYPE.INFO:
                console.info(message);
                break;
            case LOG_TYPE.WARN:
                console.warn(message);
                break;
            case LOG_TYPE.ERROR:
                console.error(message);
                break;
            default:
                console.log(message);
        }
    }
}

/**
 * copy from electron-log/lib/transports/file/find-log-path.js
 * 
 * @param {any} dirPath 
 * @returns 
 */
function prepareDir(dirPath) {
    if (!this || this.or !== prepareDir || !this.result) {
        if (!dirPath) {
            return { or: prepareDir };
        }
        dirPath = path.join.apply(path, arguments);
        mkDir(dirPath);
        try {
            fs.accessSync(dirPath, fs.W_OK);
        }
        catch (e) {
            return { or: prepareDir };
        }
    }
    return {
        or: prepareDir,
        result: (this ? this.result : false) || dirPath
    };
}

function typeOf(obj) {
    return Object.prototype.toString.call(obj).match(/\[object (\w+)\]$/)[1];
}

function mkDir(dirPath, root) {
    let dirs = dirPath.split(path.sep);
    let dir = dirs.shift();
    root = (root || '') + dir + path.sep;

    try {
        fs.mkdirSync(root);
    }
    catch (e) {
        if (!fs.statSync(root).isDirectory()) {
            throw new Error(e);
        }
    }
    return !dirs.length || mkDir(dirs.join(path.sep), root);
}

let filePathOfLog = '';
let logFileName = '';
let logWriteStream = null;

function prodLog() {
    switch (process.platform) {
        case 'linux':
            filePathOfLog = prepareDir(process.env['XDG_CONFIG_HOME'], productName)
                .or(HOME, '.config', productName)
                .or(process.env['XDG_DATA_HOME'], productName)
                .or(HOME, '.local', 'share', productName)
                .result;
            break;
        case 'darwin':
            filePathOfLog = prepareDir(HOME, 'Library', 'Logs', productName)
                .or(HOME, 'Library', 'Application Support', productName)
                .result;
            break;
        case 'win32':
            filePathOfLog = prepareDir(process.env['APPDATA'], productName)
                .or(HOME, 'AppData', 'Roaming', productName)
                .result;
            break;
        default:
            break;
    }
    if (!filePathOfLog) {
        return function () {}
    }
    fileName = `${moment().format('L')}.log`;
    logWriteStream = fs.createWriteStream(fileName, {'flags': 'w'});
    return function (type, message) {
        let time = moment().format('HH:mm:ss');
        switch(typeOf(message)) {
            case 'Object':
            case 'Array':
                message = JSON.stringify(message);
                break;
            default:
                message = message.toString();
                break;
        }
        switch(type) {
            case LOG_TYPE.INFO:
            case LOG_TYPE.WARN:
            case LOG_TYPE.ERROR:
                logWriteStream.write(`[${time}]${type}${message}`);
                break;
            default:
                logWriteStream.write(`[${time}][VERBOSE]${message}`);
                break;
        }
    }
}

class Log {
    constructor(opts) {
        switch (opts.level) {
            case LOG_LEVEL.SILENT:
            case LOG_LEVEL.LOW:
            case LOG_LEVEL.HIGH:
                this.level = opts.level;
                break;
            default:
                this.level = LOG_LEVEL.SILENT;
                break;
        }
        this._log = opts.log;
    }

    log(type, message) {
        if (this.level === LOG_LEVEL.SILENT) {
            return;
        }
        if (this.level === LOG_LEVEL.LOW && level === LOG_TYPE.ERROR) {
            this._log(type, message);
            return;
        }
        this._log(type, message);
    }

    warn(message) {
        this.log(LOG_TYPE.WARN, message);
    }

    error(message) {
        this.log(LOG_TYPE.ERROR, message);
    }

    info(message) {
        this.log(LOG_TYPE.INFO, message);
    }
}

export default {
    Log,
    prodLog,
    devLog
}
