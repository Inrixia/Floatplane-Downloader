const settings = {
	'videoFolder':'./videos/', // Default is ./videos which is inside the script folder. Can be changed to any folder on system
	'useFloatplane':true, // Default is true
	'useBitWit':false, // Default is false
	'maxVideos':30, // Default is 30 (The Max)
	'cookies': {
		'ips4_IPSSessionFront':'', // Put your session cookie's here
		'ips4_pass_hash':'',
		'ips4_login_key':'',
		'ips4_device_key':'',
		'ips4_member_id':'',
		'video_res':'1080p', // Set the resoloution here
		'parsed':'' // Ignore this
	}
}

settings.cookies.parsed = 'ips4_IPSSessionFront='+settings.cookies.ips4_IPSSessionFront+';'
+'video_res='+settings.cookies.video_res+';' // Constructs the main cookie from the cookies you gave
+'ips4_pass_hash='+settings.cookies.ips4_pass_hash+';'
+'ips4_login_key='+settings.cookies.ips4_login_key+';'
+'ips4_device_key='+settings.cookies.ips4_device_key+';'
+'ips4_member_id='+settings.cookies.ips4_member_id+';'


exports.settings = settings
