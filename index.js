var express = require('express');
var app = express();
var router = express.Router();
var sanitize = require("sanitize-filename");
var contentDisposition = require('content-disposition')

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


//Do i need FS? I will be uploading directly (caching for later???)
//var fs     = require('fs');
var path   = require('path');
//var fs     = require('fs');
var ytdl   = require('ytdl-core');
var ffmpeg = require('fluent-ffmpeg');


//Serve static content from public folder (for example our vue frontend...)
app.use(express.static(path.join(__dirname, 'public')));


router.get('/info/*', function(req, res, next) {
	
	//@Accept both url and video id
	
	if (typeof req.query.v == 'undefined') {
		throw new Error("Invalid youtube link");
	}
	//res.send("Video requested: <pre>" + JSON.stringify(req.query) + "</pre>" + "<hr/><pre>" +  JSON.stringify(req.params) + "</pre>");
	console.log("Getting info...");
	ytdl.getInfo(req.query.v, (err, info) => {
		if (err) throw err;

		videoinfo = {
			title: info.videoDetails.title,
			duration: info.videoDetails.length_seconds,
			//rating: info.avg_rating,
			uploaded_by: info.author.name,
			thumbnail: info.thumbnail_url
		};


		console.log('title:', info.title);
		console.log('duration:', info.length_seconds);
		//console.log('rating:', info.avg_rating);
		console.log('uploaded by:', info.author.name);
		console.log('thumbnail:', info.thumbnail_url);

		res.json(videoinfo);

		//@TODO: Add other thumbnails??? (If there is any...)
		//@TODO: Add story urls (maybe use image from there???)



/*
		const json = JSON.stringify(info, null, 2)
		  .replace(/(ip(?:=|%3D|\/))((?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|[0-9a-f]{1,4}(?:(?::|%3A)[0-9a-f]{1,4}){7})/ig, '$10.0.0.0');
		res.send('<pre>' + json + '</pre>');
*/
	});
});


router.get('/mp3/:bitrate/*', function(req, res, next) {
	var bitrate = 320;
    if('undefined' != typeof req.params.bitrate && req.params.bitrate) {
    	bitrate = parseInt(req.params.bitrate);
    }
	var videoid = req.query.v;
	var title = 'download';
	var download = ytdl(videoid, { filter: 'audioonly', quality: 'highest' })
		.on('info', (info, format) => {
			console.log(info);
			title = sanitize(info.videoDetails.title);
			
			console.log('Download '+ title +' has stated...\n');
			var size = (((info.videoDetails.length_seconds*bitrate) / 8)*1024);

			res.setHeader('Content-Length', size.toString());
			res.setHeader('Set-Cookie', 'fileDownload=true; path=/');
			res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
			// res.setHeader('Content-Disposition', contentDisposition(title + '.mp3'))
			res.attachment(title + ".mp3");
			console.log('Headers set...');
		})
		.on('response', (ytres) => {
			console.log('Video response from youtube is here\n');
		})
		.on('progress', (chunkLength, downloaded, total) => {
		//var floatDownloaded = downloaded / total;
		//var downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
		});

	//ffmpeg('audio.mp4')
	ffmpeg(download)
		.addInput(`https://i.ytimg.com/vi/${videoid}/maxresdefault.jpg`)
		
		// .inputOptions([
		//   '-i C:/Users/Ice/Desktop/ytdl/public/images/background.jpg',
		//   // '-c mp3on4'
		// ])
		//-map 0:0 -map 1:0 -c copy -id3v2_version 3 -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)"
		// .addOutputOption('-map', '0:0')
		// .addOutputOption('-map', '1:0')
		// .addOutputOption('-c', 'copy')
		// .addOutputOption('-id3v2_version', '3')
		.addOutputOption('-metadata:s:a', 'title="Album cover"')
		.addOutputOption('-metadata:s:a', 'comment="Cover (front)"')
		.audioCodec('libmp3lame')
		.audioBitrate(bitrate)//@TODO: Make dynamic (user can chose)
		.format('mp3')//@TODO: Make dynamic (let user chose what he wants)
		.on('error', (err) => {
			//console.error(err);
			next(err);
		})
		// .on('progress', function(info) {
		//   console.log('ffmpeg progress ' + info.percent + '%');
		// })
		// .on('data', function(chunk) {
		// 	console.log('ffmpeg just wrote ' + chunk.length + ' bytes');
		// })
		.on('end', () => {
			console.log('Download " '+ title +' " finished!');
		})
		// .saveToFile(testFile);
		.pipe(res, {
		  end: true
		});
});






//User our routes
app.use(router);


// catch 404 and forward to error handler
app.use((req,res,next)=>{
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});


//error handeling from api
app.use((err,req,res,next)=>{
	const error = app.get('env') === 'development'?err:{};
	const status = err.status || 500;

	res.status(status).json({
		error:{
			code: err.status,
			message: error.message
		}
	})

	console.log(error);
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port,()=>{
	console.log(' ytdl is running on port ' + port);
});