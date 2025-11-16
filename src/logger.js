const config = require('./config.js');

class Logger {
  httpLogger = (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();
    const logger = this; 

    res.send = function (resBody) {
      const responseTime = Date.now() - startTime;
      
      const logData = {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        auth: !!req.headers.authorization,
        responseTime: responseTime,
        req: req.body ? JSON.stringify(req.body) : '{}',
        res: typeof resBody === 'string' ? resBody : JSON.stringify(resBody),
        ip: req.ip || req.connection.remoteAddress || '',
      };

      const level = Logger.statusToLogLevel(res.statusCode);
      logger.log(level, 'http', logData); 

      res.send = originalSend;
      return res.send.call(this, resBody);
    };

    next();
  };

  logDBQuery(query, params) {
    const logData = {
      req: query,  
      params: params ? JSON.stringify(params) : '',
    };
    this.log('info', 'db', logData);
  }

  logFactoryRequest(requestBody, responseBody, success, statusCode) {
    const logData = {
      req: JSON.stringify(requestBody),    
      res: JSON.stringify(responseBody),   
      status: statusCode,                 
    };
    const level = success ? 'info' : 'error';
    this.log(level, 'factory', logData);
  }

  logException(error, req) {
    const logData = {
      message: error.message,
      stack: error.stack,
      path: req ? req.originalUrl : 'unknown',
      method: req ? req.method : 'unknown',
    };
    this.log('error', 'exception', logData);
  }

  log(level, type, logData) {
    const labels = { 
      component: config.logging.source, 
      level: level, 
      type: type 
    };
    
    const sanitizedData = this.sanitize(logData);
    const values = [this.nowString(), sanitizedData];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  static statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(logData) {
    let logString = JSON.stringify(logData);
    
    logString = logString.replace(
      /\\"password\\":\s*\\"[^"]*\\"/g, 
      '\\"password\\": \\"*****\\"'
    );
    logString = logString.replace(
      /"password":\s*"[^"]*"/g, 
      '"password": "*****"'
    );
    
    logString = logString.replace(
      /\\"token\\":\s*\\"[^"]*\\"/g, 
      '\\"token\\": \\"*****\\"'
    );
    logString = logString.replace(
      /"token":\s*"[^"]*"/g, 
      '"token": "*****"'
    );
    
    logString = logString.replace(
      /Bearer\s+[A-Za-z0-9._-]+/g, 
      'Bearer *****'
    );
    
    return logString;
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logging.url}`, {
      method: 'post',
      body: body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
      },
    }).then((res) => {
      if (!res.ok) {
        console.error('Failed to send log to Grafana');
      }
    }).catch((err) => {
      console.error('Error sending log to Grafana:', err.message);
    });
  }
}

module.exports = new Logger();