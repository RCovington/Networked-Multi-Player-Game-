// Server configuration
window.SERVER_CONFIG = {
    // EC2 instance URL
    SERVER_URL: 'http://ec2-34-217-51-125.us-west-2.compute.amazonaws.com:3513'
};

// For CommonJS compatibility (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SERVER_CONFIG;
}
