$("#search-box").keyup(function(event){
    if(event.keyCode == 13){
        $("#search-box-button").click();
    }
});
function searchSubmitted(){
	var search_term = document.getElementById('search-box').value
	botConnection
		.postActivity({
		from: { id: 'me' },
		name: 'searchBoxUpdated',
		type: 'event',
		value: search_term
		})
		.subscribe(function (id) {
		console.log('"Search box value" sent');
		});
}