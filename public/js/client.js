function searchBy(){
    var title = document.getElementById("title").value;
    var genre = document.getElementById("genre").value;
    var actor = document.getElementById("actor").value;

    const xhhttp = new XMLHttpRequest();
    xhhttp.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            // console.log("testing"); 
	    // console.log(request.query.cardsRarity)
        // console.log(JSON.stringify(JSON.parse(result)))
        let res =xhhttp.response;
        console.log(res)
        document.getElementById("results").innerHTML=res;
        }
    }
    xhhttp.open('GET', `/search?genre=${genre}&title=${title}&actor=${actor}`, true);
    xhhttp.send();
}
// function searchUser(){
//     // console.log("clicked upgrade button")
//     var input = document.getElementById("searchUser").value;
//     const inputName ={name:input}
//     const xhhttp = new XMLHttpRequest();
//     xhhttp.onreadystatechange = function(){
//         if(this.readyState == 4 && this.status == 200){
//             // console.log("testing"); 
// 	    // console.log(request.query.cardsRarity)
//         // console.log(JSON.stringify(JSON.parse(result)))
//         }
//     }
//     xhhttp.open('POST', '/searchUser', true);
//     xhhttp.setRequestHeader("Content-Type", "application/json");
//     xhhttp.send(inputName);
// }
