var rootUrl = 'https://gitlab.com';

var userId = 0;
var token;
var localUserId = localStorage.getItem('gitlab_user_id');
var localToken = localStorage.getItem('gitlab_token');

var $loading = $('#overlay');
$loading.hide();
$(document)
  .ajaxStart(function () {
    $loading.show();
  })
  .ajaxStop(function () {
    $loading.hide();
  });


if (localUserId != null && localToken != null) {
  userId = localUserId;
  token = localToken;
  getProjects(localUserId, localToken);
}




$('#logOut').on('click', function (e) {
  e.preventDefault();
  localStorage.clear();
  location.reload();
})



$('#loginForm').submit(function (event) {

  event.preventDefault();

  var isRememberMeChecked = $('input[name=rememberMe]').is(':checked');



  var $inputs = $('#loginForm :input');
  var values = {};
  $inputs.each(function () {
    values[this.name] = $(this).val();

  });



  if (values['username'] === "" || values['token'] === "") {
    alert('Username or Access Token cannot be empty');
  } else {

    $.ajax({
      type: "GET",
      headers: {
        "PRIVATE-TOKEN": values['token']
      },
      url: rootUrl+'/api/v4/users?username=' + values['username'],
      dataType: 'JSON',
      complete: function (res) {
        // check for errors
        try {
          userId = res.responseJSON[0].id;
          localStorage.setItem('author_name', res.responseJSON[0].name)
        } catch (e) {
          alert("Invalid Username")
        }
        if (userId != 0) {

          if (isRememberMeChecked) {
            localStorage.setItem('gitlab_token', values['token'])
            localStorage.setItem('gitlab_user_id', userId)
          }

          token = values['token'];

          getProjects(userId, values['token']);
        }




      }
    });

  }

});


function getProjects(userId, token) {
  $.ajax({
    url: rootUrl+'/api/v4/projects?membership=true&owned=false',
    type: 'GET',
    headers: {
      "PRIVATE-TOKEN": token
    },
    success: function (result) {
      // check for errors
      if (result.length > 0) {
        $('#defaultLoc').show();


        $('input[name=default_location]').val('helm/apps/' + result[0].path + '/Values_dev.yaml');
        $('#repositorySelect').change(function () {

          $('input[name=default_location]').val('helm/apps/' + $(this).val() + '/Values_dev.yaml');
        });

        $.each(result, function (index, value) {

          $('#repositorySelect').append('<option id="' + value.id + '" value="' + value.path + '">' + value.name + '</option>');

          $('#loginFormContainer').css('display', 'none');
          $('#repositorySelectionContainer').css('display', 'block');
        });
      } else {
        alert("No Projects Found")
      }



    },

    error: function (XMLHttpRequest, textStatus, errorThrown) {
      if (errorThrown == 'Unauthorized') {
        alert('Invalid Access token');
        token = null;
      } else {
        alert('Error');
      }
    }
  });
}



$('#repoForm').submit(function (event) {
  event.preventDefault();
  var projectId = $(this).find("option:selected").prop("id");
  var file_location = $('input[name=default_location]').val();

  window.location.replace("editor.html?project_id=" + projectId + "&token=" + token + "&file_location=" + file_location);

});


/// index ends here and editor starts


var $loading = $('#overlay');
$loading.hide();
$(document)
  .ajaxStart(function () {
    $loading.show();
  })
  .ajaxStop(function () {
    $loading.hide();
  });


$('#logout').click(function (e) {
  e.preventDefault();
  localStorage.clear();
  window.location.replace("/");
});


var editor;
var token = getUrlParameter('token');
var projectId = getUrlParameter('project_id');
var file_location = getUrlParameter('file_location');




var author_name = localStorage.getItem('author_name');
var author_email = localStorage.getItem('author_email');
var commit_message = localStorage.getItem('commit_message');
var branch = localStorage.getItem('branch');


$('input[name=author_name]').val(author_name);
$('input[name=author_email]').val(author_email);
$('input[name=commit_message]').val(commit_message);
$('input[name=branch]').val(branch);
$('input[name=file_location]').val(file_location);



$('#editor_form').submit(function (e) {
  e.preventDefault();
  var $inputs = $('#editor_form :input');
  var values = {};
  $inputs.each(function () {
    values[this.name] = $(this).val();
  });

  var fileContent = editor.getValue();

  localStorage.setItem('author_name', values['author_name'])
  localStorage.setItem('author_email', values['author_email'])
  localStorage.setItem('commit_message', values['commit_message'])
  localStorage.setItem('branch', values['branch'])


  
  if (values['file_location'] == "" ||
    values['author_name'] == "" ||
    values['author_email'] == "" ||
    values['commit_message'] == "" ||
    values['branch'] == "" ||
    fileContent == "") {

    alert('Please fill in all inputs');

  } else {
    var baseUrl = rootUrl+'/api/v4/projects/' + projectId + '/repository/files/' + encodeURIComponent(values['file_location']) + '?ref=master';

    $.ajax({
      url: baseUrl,
      type: 'PUT',
      data: {
        "branch": values['branch'], "author_email": values['author_email'], "author_name": values['author_name'],
        "content": fileContent, "commit_message": values['commit_message']
      },
      headers: {
        "PRIVATE-TOKEN": token
      },
      success: function (result) {
  
        alert("File Pushed Successfully to :" + result.file_path);
      },
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        console.log(errorThrown)

      }
    });

  }

});








$('#reloadButton').click(function (e) {
  e.preventDefault();
  loadContent(token);

});


function setUpCodeEditor(projectId, token) {
  defaultLocation = $('input[name=file_location]').val();

  editor = CodeMirror.fromTextArea(document.getElementById("file_contents"), {
    lineNumbers: true
  });

  // editor.setSize('auto', 'auto');
  editor.setOption("theme", 'material');
  loadContent(token);

}

function loadContent(token) {
  defaultLocation = $('input[name=file_location]').val();

  var baseUrl = rootUrl+'/api/v4/projects/' + projectId + '/repository/files/' + encodeURIComponent(defaultLocation) + '/raw?ref=master';

  $.ajax({
    url: baseUrl,
    type: 'GET',
    headers: {
      "PRIVATE-TOKEN": token
    },
    success: function (result) {
      editor.getDoc().setValue(result);
      setTimeout(function () {
        editor.refresh();
      }, 1);

      $('#file_editor').show();

    },
    error: function (XMLHttpRequest, textStatus, errorThrown) {
      if (errorThrown == 'Not Found') {
        alert('File Not Found');
        $('#file_editor').show();
      } else {

        alert(errorThrown);
      }

    }
  });



}
function getUrlParameter(sParam) {
  var sPageURL = window.location.search.substring(1),
    sURLVariables = sPageURL.split('&'),
    sParameterName,
    i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
    }
  }
};



