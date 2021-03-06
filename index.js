var express = require('express');
var app = express();
var router = express.Router();
var sanitize = require("sanitize-filename");
var contentDisposition = require('content-disposition')

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var path   = require('path');
var ytdl   = require('ytdl-core');
var ffmpeg = require('fluent-ffmpeg');


//Serve static content from public folder
app.use(express.static(path.join(__dirname, 'public')));


router.get('/info/*', function(req, res, next) {
	
	//@Accept both url and video id
	
	if (typeof req.query.v == 'undefined') {
		throw new Error("Invalid youtube link");
	}
	console.log("Getting info...");
	ytdl.getInfo(req.query.v, (err, info) => {
		if (err) throw err;

		videoinfo = {
			title: info.videoDetails.title,
			duration: info.videoDetails.lengthSeconds,
			//rating: info.avg_rating,//Removed by youtube, and i dont need it for now
			uploaded_by: info.author.name,
			thumbnail: info.thumbnail_url
		};

		/*
		console.log('title:', info.videoDetails.title);
		console.log('duration:', info.videoDetails.lengthSeconds);
		console.log('rating:', info.avg_rating);
		console.log('uploaded by:', info.author.name);
		console.log('thumbnail:', info.thumbnail_url);
		*/
		res.json(videoinfo);

		//@TODO: Add other thumbnails??? (If there is any...)
		//@TODO: Add story urls (maybe use image from there???)

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
			//console.log(info);
			title = sanitize(info.videoDetails.title);			
			console.log('Download '+ title +' has stated...\n');
			var size = (((info.videoDetails.lengthSeconds*bitrate) / 8)*1024);
			console.log('Length '+ info.videoDetails.lengthSeconds +' ( Size: ' + size + ')...\n');

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
		})
		.on('error', err => {
			console.error(err);
		});

	//ffmpeg('audio.mp4')
	ffmpeg(download)
		.addInput(`https://i.ytimg.com/vi/${videoid}/maxresdefault.jpg`)
	
		.addOutputOption('-metadata:s:a', 'title="Album cover"')
		.addOutputOption('-metadata:s:a', 'comment="Cover (front)"')
		.audioCodec('libmp3lame')
		.audioBitrate(bitrate)//@TODO: Make dynamic (user can chose)
		.format('mp3')//@TODO: Make dynamic (let user chose what he wants)
		.on('error', (err) => {
			console.error(err);
			next(err);
		})
		/*
		.on('progress', function(info) {
		  console.log('ffmpeg progress ' + info.percent + '%');
		})
		.on('data', function(chunk) {
			console.log('ffmpeg just wrote ' + chunk.length + ' bytes');
		})
		*/
		.on('end', () => {
			console.log('Download " '+ title +' " finished!');
		})
		// .saveToFile(testFile);//Dont write to file, pipe it to response (<3 you Node.js !)
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


//error handling from??api
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