---
cssclasses: smaller-right
taggedPages: true
---
# Tasks
Include Tagged pages `INPUT[toggle:taggedPages]`
```dataviewjs
let tasksFromTaggedPages = dv.page("Tasks").file.frontmatter["taggedPages"];
let activeFile = app.workspace.getActiveFile()?.name;
if (!activeFile || activeFile == "Tasks.md") {
	// track the previously active File, when we (Tasks.md) become the active file 
	//   (for example, when a task is checked off).
	activeFile = app.workspace.getLastOpenFiles()[0];
}
await dv.view("scripts/tasklist", {thePage: activeFile,
	tasksFromThisPage:true, 
	taggedTasksFromAnywhere:true, 
	tasksFromTaggedPages:tasksFromTaggedPages,
	tasksFromIncludedPages:true});
```

# Log
## Mon, September 30, 2024
#date/2024/09/30 [12:12PM -1000]
<% tp.file.cursor(1) %>
## Conversation with Mark - Mon, September 30, 2024
#date/2024/09/30 [11:59AM -1000]
<% tp.file.cursor(1) %>
