const ver = "1.0.10"
// Documentation: https://github.com/ces3001/tasklist/blob/main/README.md
// to include in pages (simplest): 
// ```dataviewjs
// await dv.view("scripts/tasklist");
// ```
// to include in pages (with all options, all optional):
// ```dataviewjs
// await dv.view("scripts/tasklist", {thePage: "Optional page name", tasksFromThisPage:true, taggedTasksFromAnywhere:true, tasksFromTaggedPages:true, tasksFromIncludedPages:true, ifTaskTaggedThenOnlyIfOurTag:true, includeSection:true, summary:true});
// ```

// defaults
let debug = false
let thisPage = dv.current()
let tasksFromThisPage = true
let taggedTasksFromAnywhere = true
let tasksFromTaggedPages = true
let tasksFromIncludedPages = true 
let ifTaskTaggedThenOnlyIfOurTag = true
let avoidFolders = ["templates","Health"] // default list of folders to avoid looking for tasks
let includeSection = true
let summary = true
// override any defaults from parameters passed
if (typeof input !== "undefined") {
	if (typeof input.summary !== "undefined") { summary = input.summary }
	if (typeof input.debug !== "undefined") { debug = input.debug }
	if (typeof input.tasksFromThisPage !== "undefined") { tasksFromThisPage = input.tasksFromThisPage }
	if (typeof input.taggedTasksFromAnywhere !== "undefined") { taggedTasksFromAnywhere = input.taggedTasksFromAnywhere }
	if (typeof input.tasksFromTaggedPages !== "undefined") { tasksFromTaggedPages = input.tasksFromTaggedPages }
	if (typeof input.tasksFromIncludedPages !== "undefined") { tasksFromIncludedPages = input.tasksFromIncludedPages }
	if (typeof input.ifTaskTaggedThenOnlyIfOurTag !== "undefined") { ifTaskTaggedThenOnlyIfOurTag = input.ifTaskTaggedThenOnlyIfOurTag }
	if (typeof input.avoidFolders !== "undefined") { avoidFolders = input.avoidFolders }
	if (typeof input.includeSection !== "undefined") { includeSection = input.includeSection }
	if (typeof input.thePage !== "undefined") { 
		thisPage = dv.page(input.thePage)
		if (!thisPage) {
			dv.span(`**ERROR** No page ${input.thePage}`);
			return 
		}
		if (summary) { dv.span("From " + thisPage.file.link + " " + 
						(tasksFromTaggedPages?"plus tagged":"") + ": \n") } 
	}
}

if (debug) { dv.span(">[!DEBUG]\n") }

// Initialize myAliases and myTag
let myAliases = []
let myTag = ""
try{ 
	if (thisPage.aliases) {
		if (Array.isArray(thisPage.aliases)) {
			myAliases = thisPage.aliases 
		} else {
			myAliases = Array(thisPage.aliases) 
		}
		for (let i = 0; i < myAliases.length; i++) {
			if (myAliases[i].startsWith("#")) {
				myTag = myAliases[i];
				break;
			}
		}
	}
} catch(e) { 
	if (debug) { dv.span(`Error caught ok. No aliases. ${e}`) }
	myAliases = []
	myTag = ""
}

// Add note name as an alias
if (!myAliases.includes(thisPage.file.name)) {
    myAliases.push(thisPage.file.name); 
}
if (debug) { dv.span("> myAliases:" + myAliases + " myTag:" + myTag + "\n") }

function isWordInString(word, str) {
  const pattern = new RegExp(`(^|\\s|[\\p{P}])${word}(\\s|[\\p{P}]|$)`, 'ui');
  return pattern.test(str);
}

let taskList = dv.array([])

// Tasks from this page
if (tasksFromThisPage && !thisPage.file.etags.includes("#ignoretasks")) { 
try{ // in a try loop in case no tasks.
  taskList = taskList.concat( 
	thisPage.file.tasks.where(t => !t.completed &&
		dv.date(t.start) <= dv.date('today')))}
finally{}
}

// tasks from other pages listed in `includeTasksFrom`
if (tasksFromIncludedPages && thisPage.includeTasksFrom) {
	for (let page of dv.array(thisPage.includeTasksFrom)) {
		let includeFile = dv.page(String(page).replace(/[\[\]]/g,"").replace(/\|(.+)/g,""))
		if (typeof(includeFile) !== "undefined") {
			if (!includeFile.file.etags.includes("#ignoretasks")) {
				taskList = taskList.concat(includeFile
					.file.tasks.where(t => !t.completed && dv.date(t.start) <= dv.date('today')));
			}
		} else {
			if (debug) { dv.span("<br>(Cannot include from '" + page + "', as it is not a file.)") }
		}
	}
}

// tasks including this tag or alias from this or other pages, except if page tagged #ignoretasks
if (taggedTasksFromAnywhere && myAliases) {
	taskList = taskList.concat(  
		dv.pages("-#ignoretasks") // ignore pages with #ignoretasks
		.where(p => (tasksFromThisPage || (p.file.name != thisPage.file.name))) 
		.file.tasks.where(t => {
			if (t.completed || dv.date(t.start) > dv.date('today')) {
				return false; }
			if (ifTaskTaggedThenOnlyIfOurTag && t.text.includes('#') && myTag != "") { 
				// if it has a tag, only include this task if it has "our" tag, not tasks tagged with some other tag, even if it may match another non-tag alias of thePage.
				return t.text.toLowerCase().includes(myTag.toLowerCase());
			} else {
				return (myAliases.some(alias => isWordInString(alias,t.text)))
			}
		})
	)
}

// tasks from any page which contains this tag, except if tagged #multiproject or #ignoretasks
if (tasksFromTaggedPages && myTag != "") {  
  taskList = taskList.concat( 
	dv.pages(myTag + " and (-#multiproject and -#ignoretasks)")
		.where(p => (tasksFromThisPage || (p.file.name != thisPage.file.name))) 
		//.sort(p => p.file.mtime, "desc")
		.file.tasks
			.where(t => !t.completed &&
				dv.date(t.start) <= dv.date('today')))}

// Remove those in the exclude list, unless it includes myTag
if (thisPage.excludeTasksWith) {
	excludeTasksWith = dv.array(thisPage.excludeTasksWith)
	if (excludeTasksWith.length > 0) {
	// Loop through objects and remove elements where their .text attribute contains any of the strings to exclude, unless it includes myTag
		taskList = taskList.filter(t => {
			if (!t.text.toLowerCase().includes(myTag.toLowerCase())) {
				for (let i = 0; i < excludeTasksWith.length; i++) {
					if (t.text.toLowerCase().includes(excludeTasksWith[i].toLowerCase())) {
						return false;
					}
				}
			}
			return true;
		});
	}
}

// OUTPUT
let base_header_num = 2
// print them out, make sure no dups, and sort by appearance in note
if (taskList.length > 0) {
	// use the earliest line number as a sorting algorithm, since I generally use reverse chronological order in my notes.
	// And override with Priority indicators from Tasks plug-in (no field is associated with these in dataview, so must check text string)
	if (avoidFolders) {
	  taskList = taskList.filter(t => !avoidFolders.some(folder => t.path.includes(folder + "/")));
	}
	taskList = taskList
		.distinct(t => t.text)
		.sort(t => t.line)
		.sort(t => t.path)
		.sort(t => t.text.contains("🔺")?0:t.text.contains("⏫")?1:t.text.contains("🔼")?2:t.text.contains("🔽")?4:t.text.contains("⏬")?5:3) 
		.sort(t => -dv.page(t.path).file.mday)
		
	if (summary) { dv.span("*" + taskList.length + " tasks*\n") }
	if (includeSection) {
		const regex = /> ([^\]]+)/; // Default render for section is 'PAGENAME > SECTION'. Get the second part after '>' so we don't include the name of the document again.
		let section = null
		let page = null
		let sectionTaskList = []
		for (let t of taskList) {
			if ((sectionTaskList.length > 0) && 
			    ((page != t.path) || (section != t.section.toString()))) {
				dv.taskList(sectionTaskList,false) // false = don't group by file
			}
			if (page != t.path) {
				dv.header(base_header_num,dv.page(t.path).file.name)
				page = t.path
			}
			if (section != t.section.toString()) {
				section = t.section.toString()
				if (section.match(regex) != null) {
					let sectionname = section.match(regex)[1]
					let filename = dv.page(t.path).file.name
					if (filename.replace(":"," ").replace("."," ") != sectionname) { // If file only has top-level section, don't include as *for me* it's always the same as the filename
						let elimAfterLast = ' at ' // ' at ' removes time. ' - ' removes date
						let lastIndex = sectionname.lastIndexOf(elimAfterLast); 
						let link =  " [[" + filename + "#"+ sectionname + "|→]]"
						dv.header(base_header_num + 2, (lastIndex>-1?sectionname.substring(0, lastIndex):sectionname) + link)
					}
				} else {
					dv.header(base_header_num + 1, "No section")
				}
				sectionTaskList = []
			}
			sectionTaskList = sectionTaskList.concat(t)
		}
		dv.taskList(sectionTaskList,false)
	} else {
		dv.taskList(taskList,true) } // true = divide by file
} else {
	if (summary) { dv.span("*No available tasks*") }
}
