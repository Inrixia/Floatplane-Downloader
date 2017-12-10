const settings = {
	'videoFolder':'./videos/', // Default is ./videos which is inside the script folder. Can be changed to any folder on system
	'useFloatplane':true, // Default is true
	'useBitWit':false, // Default is false
	'maxVideos':30, // Default is 30 (The Max)
	'cookies': {
		'ips4_IPSSessionFront':'', // Put your session cookie here
		'video_res':'1080p', // Set the resoloution here
		'parsed':'' // Ignore this
	},
	'email':'',
	'password':''
}

settings.cookies.parsed = 'ips4_IPSSessionFront='+settings.cookies.ips4_IPSSessionFront+';'
+'video_res='+settings.cookies.video_res+';' // Constructs the main cookie from the cookies you gave
exports.settings = settings
