function isLoggedIn(sessionService){
  var data = sessionService.get("loginData");
  if(!data || !data.userType || !data.model){
    return false;
  }
  else{
    return true;
  }
}

function takeActionIfNotLoggedIn(sessionService, $state){
  if(!isLoggedIn(sessionService)){
    $state.go('login', {}, {reload: true});
  }
}

function isCurrentUserAParent(sessionService){
  return sessionService.get("loginData").userType=="Parent";
}

function isOfficeHours(settings){
  settings.fromTime = new Date(settings.fromTime);
  settings.toTime = new Date(settings.toTime);
  cur = new Date();
  var currentTime = new Date(new Date(1970,0,1,cur.getHours(),cur.getMinutes(),cur.getSeconds(),cur.getMilliseconds()).getTime());
  if(settings.toTime<settings.fromTime){
    settings.toTime.setDate(settings.toTime.getDate()+1);
  }
  var isItTime = (currentTime>settings.fromTime && currentTime<settings.toTime);
  var c = currentTime;
  var f = settings.fromTime;
  var t = settings.toTime;
  isItTime = (c.getHours()>f.getHours() && c.getHours()<t.getHours()) && (c.getMinutes()>f.getMinutes() && c.getMinutes()<t.getMinutes());
  switch (new Date().getDay()) {
    case 0:
      return settings.sunday && isItTime;
      break;
    case 1:
      return settings.monday && isItTime;
      break;
    case 2:
      return settings.tuesday && isItTime;
      break;
    case 3:
      return settings.wednesday && isItTime;
      break;
    case 4:
      return settings.thursday && isItTime;
      break;
    case 5:
      return settings.friday && isItTime;
      break;
    case 6:
      return settings.saturday && isItTime;
      break;
    default:
      return false;
  }
}

angular.module('starter.controllers', ['ionic', 'starter.config','starter.services', 'ngCordova'])

.controller('AppCtrl', function($scope, $ionicModal, $ionicPopup, $timeout, $ionicHistory, $state, $http, urlConfig, sessionService, school, student, classes) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});
  $scope.toggleDrag = false;
  $scope.officeHours = false;
  $scope.schools = [];
  school.getAll(function(data){
    console.log(data);
    $scope.schools = data;
  });
  $scope.isParent = true;
  // Form data for the login modal
  $scope.loginData = {
    userType:'Parent'
  };
  //Form data for the sign up page
  $scope.signUpData = {
    choice:'Parent'
  };
  $scope.message = '';

  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });



  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // An alert dialog
 $scope.showAlert = function(message) {
   var alertPopup = $ionicPopup.alert({
     title: 'Message',
     template: message
   });
   alertPopup.then(function(res) {
     console.log('Sign up alert shown');
   });
 }

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    $ionicHistory.nextViewOptions({
              disableBack: true
          });
    console.log('Doing login', $scope.loginData);
    var loginUrl = urlConfig.backend+"auth";
    $http.post(loginUrl,$scope.loginData)
    .error(function(data, status, headers, config) {
      console.log(data,status,headers,config);
      $scope.showAlert('Invalid Username/Password: ' + data.err);
    })
    .then(function(res){
      $scope.toggleDrag = true;
      console.log(res);
      sessionService.store("loginData",res.data);
      if(res.data.model.settings && isOfficeHours(res.data.model.settings)){
        $scope.officeHours = true;
      }
      if(res.data.userType=="Parent"){
        student.getWardsOfParent(res.data.model,function(data){
          sessionService.store("wards", data);
          $scope.isParent = true;
          console.log(data);

          if(!data || data.length==0){
            $state.go('app.addWard');
          }
          else{
            $state.go('app.browse');
          }
        });

      }
      else {
        classes.getSubjectsOfTeacher(res.data.model.id, function(data){
          $scope.isParent = false;
          if(!data || data.length==0){
            $state.go('app.addSubject');
          }
          else{
            $state.go('app.browse');
          }
        });
      }

    });
    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };

  $scope.radioChange = function () {
    console.log($scope.signUpData.choice);
    var choice = $scope.signUpData.choice;
    if(choice=='Parent'){
      document.getElementById("enrollmentNumber").value = " Not Required";
      document.getElementById("enrollmentNumber").disabled = true;
    }
    else {
        document.getElementById("enrollmentNumber").value = "";
        document.getElementById("enrollmentNumber").disabled = false;
    }
  }
  //Logic for sign up
  $scope.doSignUp = function(form){
    if(form.$valid)
    {
      var data = $scope.signUpData;
      var createUrl = '';
      if($scope.signUpData.choice=='Parent')
      {
        createUrl =  urlConfig.backend+'parents/create';
        if(data.registrationNo){
          delete data.registrationNo;
        }
      }
      else {
        createUrl =  urlConfig.backend+'teachers/create';
      }
      delete data.choice;
      $http.post(createUrl,data).then(function(res) {
        console.log(res);
        if(res.statusText=='Created'){
          $scope.showAlert("Sign up succesful!");
          $state.go('app.login');
        }
        else{
          $scope.showAlert("Oops, Error in signing you up!")
        }
      });

    }
  };
})

.controller('ChatsCtrl', function($scope, Chats, sessionService, classes, teachers, student, $ionicLoading) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});
  var userType = sessionService.get("loginData").userType;
  var ward;
  function getChatItems(wards){
    console.log(wards);
    wards.forEach(function(val,i,a){
      classes.getTeachersOfClass(val.student.class, function(data){
        for(i=0;i<data.length;++i){
          name = data[i].teacher.firstname+' '+data[i].teacher.lastname;
          subject = data[i].subject.subjectname;
          $scope.chatItems[i] = {
            id:data[i].teacher.id,
            name:name,
            subject: subject
          };
        }
      });
    });
  }
  $scope.chatItems = [];
  if(userType=='Parent'){
    var wards = sessionService.get("wards");
    if(!wards){
        student.getWardsOfParent(sessionService.get("loginData").model.id, function(data){
          sessionService.set("wards",data);
          getChatItems(data);
        });
    }
    else{
      getChatItems(wards);
    }

  }
  else {
    var loginData = sessionService.get("loginData");
    var user = loginData.model;
    var teacherId = loginData.model.id;
    teachers.getAllClassesOfTeacher(teacherId, function(data){
      $ionicLoading.show();
      data.forEach(function(element,index,array){
        classId = element.class.id;
        student.getStudentsOfClass(classId, function(students){
          students.forEach(function(val,i,a){
            student.getWardDataOfStudent(val.id,function(wards){
              $ionicLoading.hide();
              wards.forEach(function(ward,ind,arr){
                console.log(ward);
                name = ward.parent.firstname + ' ' + ward.parent.lastname;
                subject = element.class.standard+' '+element.class.section + ', ' + ward.type + ', ' + ward.student.firstName + ' ' + ward.student.lastName;
                $scope.chatItems.push({
                  id:ward.parent.id,
                  name:name,
                  subject: subject
                });
              });
            });
          });
        });
      });
    });
  }
  // $scope.chats = Chats.all();
  // $scope.remove = function(chat) {
  //   Chats.remove(chat);
  // }
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats, sessionService, parents, teachers) {
  $scope.hideTime = true;
  var userType = sessionService.get("loginData").userType;
  var alternate, isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();
  $scope.messages = [];
  $scope.userData = {};
  $scope.myId = sessionService.get("loginData").model.id;
  userId = $stateParams.chatId; //Get user Id of who we are going to chat with
  var teacherId,parentId;
  ///Retrieve user data of the person we are going to chat with. This depends on whether the current user is a parent or a teacher.
  if(userType=="Parent"){
    teachers.getTeacher(userId, function(data){
      $scope.userData = data;
    });
    parentId = $scope.myId;
    teacherId = userId;
  }
  else{
    parents.getParent(userId, function(data){
      $scope.userData = data;
    });
    parentId = userId;
    teacherId = $scope.myId;
  }
  function getLatestChats(){
    var skip = $scope.messages.length;
    Chats.getChats(teacherId,parentId,skip, function(data){
      data.forEach(function (val,i,a) {
        obj = {
          userId: val.senderId,
          text: val.message,
          time: new Date(val.time).toLocaleTimeString().replace(/:\d+ /, ' ')
        };
        $scope.messages.push(obj);
      })
    });
  }
  io.socket.on('message', function(msg){

  });
  getLatestChats();
  $scope.sendMessage = function() {
    var d = new Date();
    d = d.toLocaleTimeString().replace(/:\d+ /, ' ');
    Chats.sendChat({
      parent:parentId,
      teacher:teacherId,
      senderId:$scope.myId,
      sender:userType,
      message:$scope.data.message,
      time:new Date()
    });
    //TO DO : Need to integrate socket/GCM/ApplePush services here for sending messages. Maybe just socket for now

    obj = {
      userId: $scope.myId,
      text: $scope.data.message,
      time: d
    };
    $scope.messages.push(obj);
    console.log(obj);
  }
  var intervalID = setInterval(getLatestChats,2000);
  //$scope.chat = Chats.get($stateParams.chatId);
})

.controller('NoticeBoardCtrl', function($scope, noticeBoard, $state, $ionicModal,$cordovaCamera,$ionicLoading, sessionService, classes, student, urlConfig, images){
  var userType = sessionService.get("loginData").userType;
  var model = sessionService.get("loginData").model;
  var ward;
  var wards = [];
  $scope.images = [];
  $scope.noticeImages = [];
  $scope.imageFiles = [];

  $scope.showImages = function(notice,index) {
   $scope.activeSlide = index;
   $scope.showModal('templates/imageModal.html', notice);
  }

   $scope.showModal = function(templateUrl, notice) {
     $scope.notice = notice;
     $ionicModal.fromTemplateUrl(templateUrl, {
       scope: $scope,
       animation: 'slide-in-up'
     }).then(function(modal) {
       $scope.modal = modal;
       $scope.modal.show();
     });
   }

   // Close the modal
   $scope.closeModal = function() {
     $scope.modal.hide();
     $scope.modal.remove()
   };

  function upload(fileURL){
    var win = function (r) {
      $ionicLoading.hide();
      var response = JSON.parse(r.response);
      var fileName = response.files[0].filename;
      $scope.imageFiles.push(fileName);
    console.log("Code = " + r.responseCode);
    console.log("Response = " + r.response);
    console.log("Sent = " + r.bytesSent);
    }

    var fail = function (error) {
      $ionicLoading.hide();
      alert("An error has occurred: Code = " + error.code);
      console.log("upload error source " + error.source);
      console.log("upload error target " + error.target);
    }

    var options = new FileUploadOptions();
    options.fileKey = "image";
    options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);

    var params = {};
    params.value1 = "test";
    params.value2 = "param";

    options.params = params;

    var ft = new FileTransfer();
    ft.upload(fileURL, encodeURI(urlConfig.backend+"image/upload"), win, fail, options);
  }
  $scope.uploadImage = function(){
    $ionicLoading.show();
    window.imagePicker.getPictures(
			function(results) {
				for (var i = 0; i < results.length; i++) {
					console.log('Image URI: ' + results[i]);
					$scope.images.push(results[i]);
          upload(results[i]);
				}
				if(!$scope.$$phase) {
					$scope.$apply();
				}
			}, function (error) {
				console.log('Error: ' + error);
        $scope.showAlert(error);
			},
      {
        maximumImagesCount: 3,
        width: 600,
        height: 600,
        quality: 50
      }
		);
    // navigator.camera.getPicture(onSuccess, onFail, { quality: 50,
    //     sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
    //     destinationType: Camera.DestinationType.FILE_URI });
    //
    // function onSuccess(imageURI) {
    //    $scope.showAlert(imageURI);
    // }
    //
    // function onFail(message) {
    //     $scope.showAlert('Failed because: ' + message);
    // }
  }

  $scope.cls = [];
  $scope.notices = [];
  $scope.modalShow = true;
  if(userType=='Parent'){
    $scope.modalShow = false;
    wards = sessionService.get("wards");
    if(wards.length==0){
    student.getWardsOfParent(model,function(data){
      wards = data;
    //  updateNoticeBoard();
      });
    }
    else{
    //  updateNoticeBoard();
    }
  }
  classes.getAllClasses(function(cls)
  {
    $scope.cls = cls;
  });
  function getImages(notices){
    notices.forEach(function(val,i,a){
      if(val.images){
        val.images.forEach(function(im,index,arr){
          images.getImage(im,function(data){
            val.images[index] = data[0];
          });
        });
      }
    });
  }
  function updateNoticeBoard(){
    $ionicLoading.show();
    $scope.notices = [];
    $scope.noticeImages = [];
    userType = sessionService.get("loginData").userType;
    model = sessionService.get("loginData").model;
    if(userType=='Teacher'){
      noticeBoard.getAllNotices(function(notices){
        $scope.notices = notices;
        getImages($scope.notices);
        console.log($scope.notices);
        $ionicLoading.hide();
      });
    }
    else {
      wards.forEach(function(val,i,a){
        noticeBoard.getNoticesOfClass(val.student.class,function(notices){
          Array.prototype.push.apply($scope.notices,notices);
          getImages($scope.notices);
          $ionicLoading.hide();
        });
      });
    }
  }
  $scope.refresh = updateNoticeBoard;
  //updateNoticeBoard();

  $ionicModal.fromTemplateUrl('templates/modal.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.noticeModal = modal;
  })

  $scope.postMessage = function(announcement) {
    announcement.images = $scope.imageFiles;
    console.log(announcement);
    $ionicLoading.show();
    noticeBoard.postNotice(announcement, function(err){
      $scope.showAlert(err);
      $ionicLoading.hide();
    }, function(){
      updateNoticeBoard();
      $ionicLoading.hide();
      $scope.noticeModal.hide();
    });
  }

  $scope.$on('$ionicView.enter', function(e) {
    if(userType=='Parent'){
      wards = sessionService.get("wards");
      if(wards.length==0){
      student.getWardsOfParent(model,function(data){
        wards = data;
        updateNoticeBoard();
        });
      }
      else{
        updateNoticeBoard();
      }
    }
    else {
      updateNoticeBoard();
    }
  });
})

.controller('StudentReviewCtrl', function($scope, $state, $ionicModal, $ionicPopup, sessionService, classes, student, teachers) {
  //Need to add search students mechanism
  $scope.review = {};
  $scope.reviews = [];
  $ionicModal.fromTemplateUrl('templates/studentListView.html', function(modal) {
     $scope.modal = modal;
   }, {
     // Use our scope for the scope of the modal to keep it simple
     scope: $scope,
     // The animation we want to use for the modal entrance
     animation: 'slide-in-up'
   });
   var myId = sessionService.get("loginData").model.id;
   function updateReviews(){
     teachers.getTeacherReviews(myId, function(data){
       $scope.reviews = data;
       console.log("Reviews",data);
     });
   }
   updateReviews();
   $scope.showAlert = function(message) {
     var alertPopup = $ionicPopup.alert({
       title: 'Message',
       template: message
     });
     alertPopup.then(function(res) {
       console.log('Alert box shown!');
     });
   }

   $scope.onChange = function(){
     student.getStudentsLike($scope.review.studentNameModal,function(data){
       $scope.studs = data;
     });
   }

   $scope.onClickList = function(model){
     $scope.modal.hide();
     $scope.review.model = model;
     $scope.review.studentName = model.firstName + ' ' + model.lastName;
   }

   $scope.postReview = function(){
     var obj = {
       teacher: sessionService.get("loginData").model,
       student: $scope.review.model,
       review: $scope.review.comments
     };
     if($scope.review.model){
       teachers.postReview(obj, function(data){
            updateReviews();
       });
     }
     else {
       $scope.showAlert("Invalid student name entered!");
     }
   }
})

.controller('MyWardCtrl', function($scope, $state, $ionicModal, sessionService, student) {
  var userType = sessionService.get("loginData").userType;
  $scope.wards = [];
  $scope.reviews = [];
  $scope.getReviews = function(ward){
    student.getWardReviews(ward.student,function(data){
      $scope.reviews = data;
    });
  }

  if(userType=='Parent'){
    var wards = sessionService.get("wards");
    if(wards.length==0){
      student.getWardsOfParent(sessionService.get("loginData").model,function(data){
        $scope.wards = data;
        $scope.getReviews(data[0]);
      });
    }
    else{
      $scope.wards = wards;
      $scope.getReviews(wards[0]);
    }

  }

})
.controller('ProfileCtrl', function($scope, sessionService) {
  currentUser = sessionService.get("loginData");
  $scope.user = currentUser.model;
  $scope.userType = currentUser.userType;
  console.log(currentUser);

  $scope.userType = {
   "type": "select",
   "name": "User Type",
   "value": currentUser.userType,
   "values": [ "Parent", "Teacher", "Gaurdian"]
 };

})
.controller('Messages', function($scope, $timeout, $ionicScrollDelegate) {

  $scope.hideTime = true;

  var alternate,
    isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();

  $scope.sendMessage = function() {
    alternate = !alternate;

    var d = new Date();
  d = d.toLocaleTimeString().replace(/:\d+ /, ' ');

    $scope.messages.push({
      userId: alternate ? '12345' : '54321',
      text: $scope.data.message,
      time: d
    });

    delete $scope.data.message;
    $ionicScrollDelegate.scrollBottom(true);

  };


  $scope.inputUp = function() {
    if (isIOS) $scope.data.keyboardHeight = 216;
    $timeout(function() {
      $ionicScrollDelegate.scrollBottom(true);
    }, 300);

  };

  $scope.inputDown = function() {
    if (isIOS) $scope.data.keyboardHeight = 0;
    $ionicScrollDelegate.resize();
  };

  $scope.closeKeyboard = function() {
    // cordova.plugins.Keyboard.close();
  };


  $scope.data = {};
  $scope.myId = '12345';
  $scope.messages = [];

})
.controller('MenuCtrl', function($scope, $stateParams, sessionService) {
  $scope.isParent = false;
  if(sessionService.get("loginData")!=null){
    $scope.isLoggedIn = true;
    if(sessionService.get("loginData").userType=="Parent"){
      $scope.isParent = true;
    }
    else{
      $scope.isParent = false;
    }
  }
  else{
    $scope.isLoggedIn = false;
  }

})
.controller('LogoutCtrl', function($scope, $stateParams, $ionicHistory, $state, sessionService) {
  sessionService.destroy("loginData");
  $ionicHistory.nextViewOptions({
            disableBack: true
        });
  $state.go("app.login");
})
.controller('AddWardCtrl', function($scope, $stateParams, $ionicModal, student, sessionService) {
  $scope.review = {};
  $scope.wards = [];
  $scope.studs = [];
  $scope.myWard = {};
  model = sessionService.get("loginData").model;
  $scope.hideNavBar = true;
  $scope.hideBackButton = true;

  function checkWard(){
    if($scope.wards.length>0){
      $scope.hideNavBar = false;
      $scope.hideBackButton = false;
    }
    else {
       console.log("Test");
        $scope.showAlert("Please add a ward to continue.");
    }
  }

  function loadWards(){
    $scope.wards = [];
    student.getWardsOfParent(model,function(data){
      console.log(data);
      data.forEach(function(val,i,a){
        $scope.wards.push(val);
        checkWard();
      });
    });
  }
  loadWards();
  checkWard();
  $scope.onChange = function(){
    student.getStudentsLike($scope.review.studentNameModal,function(data){
      $scope.studs = data;
    });
  }
  $scope.onClickList = function(model){
    $scope.modal.hide();
    $scope.myWard.model = model;
    $scope.myWard.studentName = model.firstName + ' ' + model.lastName;
  }

  $ionicModal.fromTemplateUrl('templates/studentListView.html', function(modal) {
     $scope.modal = modal;
   }, {
     scope: $scope,
     animation: 'slide-in-up'
   });

   $scope.addWard = function(){
     var obj = {
       parent:sessionService.get("loginData").model.id,
       student: $scope.myWard.model.id,
       type:"Parent"
     };
     student.addParent(obj, function(data){
       console.log(data);
       loadWards();
     });
   }
})
.controller('SettingsCtrl', function($scope, $stateParams, sessionService) {
  $scope.isParent = isCurrentUserAParent(sessionService);
  settings = sessionService.get("loginData").model.settings;
  if(settings && isOfficeHours(settings)){
    $scope.officeHours = true;
  }
  console.log($scope.officeHours);

})
.controller('AddSubjectCtrl', function($scope, $stateParams,$ionicModal, $ionicActionSheet, $timeout,sessionService, student, classes) {
  $scope.hideNavBar = true;
  $scope.hideBackButton = true;
  function checkSubjects(){
    if($scope.subjects.length>0){
      $scope.hideNavBar = false;
      $scope.hideBackButton = false;
    }
    else {
      $scope.showAlert("Please add a subject to continue.");
    }
  }
  $ionicModal.fromTemplateUrl('templates/subjectModal.html', function(modal) {
     $scope.modal = modal;
   }, {
     scope: $scope,
     animation: 'slide-in-up'
   });
   model = sessionService.get("loginData").model;
   $scope.subjects = [];
   function loadClasses(){
     $scope.cls = [];
     classes.getAllClasses(function(cls) {
       $scope.cls = cls;
     });
   }
   function loadSubjects(){
     $scope.subjects = [];
     classes.getSubjectsOfTeacher(model.id, function(data){
       data.forEach(function(val,i,a){
         $scope.subjects.push(val);
         checkSubjects();
       });
     });
   }
   loadSubjects();
   loadClasses();
   checkSubjects();

   $scope.subModal = {};
   $scope.subs = [];
   $scope.subject = {};
   $scope.onChange = function(){
     classes.getSubjectsLike($scope.subModal.nameModal,function(data){
       $scope.subs = data;
     });
   }
   $scope.onClickList = function(model){
     $scope.modal.hide();
     $scope.subModal.model = model;
     $scope.subject.subjectName = model.subjectName;
   }
   $scope.addSubject = function(){
     var obj ={
       teacher:model.id,
       subject:$scope.subModal.model.id,
       class: $scope.subject.class.id
     };
     classes.createSubjectTeacher(obj, function(data){
       loadSubjects();
       checkSubjects();
     });
   }

   $scope.showDeleteOption = function(subject) {

   // Show the action sheet
   var hideSheet = $ionicActionSheet.show({
     buttons: [
     ],
     destructiveText: 'Delete',
     titleText: 'Actions',
     cancelText: 'Cancel',
     cancel: function() {
          // add cancel code..
        },
     buttonClicked: function(index) {
       return true;
     },
     destructiveButtonClicked: function(index){
       classes.removeSubjectTeacher(subject.id,function(res){
         loadSubjects();
         return true;
       });
     }
   });

   // For example's sake, hide the sheet after two seconds
   $timeout(function() {
     hideSheet();
   }, 4000);

  };

})
.controller('OfficeHoursCtrl', function($scope, $stateParams, school, sessionService) {
  $scope.settings = {
    fromTime:new Date(1970, 0, 1, 9, 00, 0),
    toTime: new Date(1970, 0, 1, 18, 00, 0)
  };
  model = sessionService.get("loginData").model;
  console.log(model.settings);

  if(model.settings){
    isOfficeHours(model.settings);
    $scope.settings = model.settings;
    $scope.settings.fromTime = new Date(model.settings.fromTime);
    $scope.settings.toTime = new Date(model.settings.toTime);
  }
  $scope.save = function(){
    $scope.settings.fromTime = new Date($scope.settings.fromTime);
    $scope.settings.toTime = new Date($scope.settings.toTime);
    user = (sessionService.get("loginData").userType=="Parent")?"parents":"teachers";
    model.settings = $scope.settings;
    school.update(user,model,function(){
      $scope.showAlert("Could not update");
    },
    function(data){
      $scope.showAlert("Settings Saved");
      session = sessionService.get("loginData");
      session.model = model;
      sessionService.store("loginData",session);
      if(isOfficeHours(model.settings)){
        $scope.officeHours = true;
      }
    });
    console.log(model);
  }
})
.controller('PlaylistsCtrl', function($scope) {
  $scope.playlists = [
    { title: 'Reggae', id: 1 },
    { title: 'Chill', id: 2 },
    { title: 'Dubstep', id: 3 },
    { title: 'Indie', id: 4 },
    { title: 'Rap', id: 5 },
    { title: 'Cowbell', id: 6 }
  ];
})
.controller('PlaylistCtrl', function($scope, $stateParams) {
});
