angular.module('starter.controllers', ['ionic', 'starter.config','starter.services'])

.controller('AppCtrl', function($scope, $ionicModal, $ionicPopup, $timeout,$state, $http, urlConfig, sessionService, school, student) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});
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
  // Create the login modal that we will use later
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
    console.log('Doing login', $scope.loginData);
    var loginUrl = urlConfig.backend+"auth";
    $http.post(loginUrl,$scope.loginData)
    .error(function(data, status, headers, config) {
      $scope.showAlert('Invalid Username/Password');
    })
    .then(function(res){
      console.log(res);
      sessionService.store("loginData",res.data);
      if(res.data.userType=="Parent"){
        student.getWardsOfParent(res.data.model,function(data){
          sessionService.store("wards", data);
          $scope.isParent = true;
          console.log(data);
          $state.go('app.browse');
        });

      }
      else {
        $scope.isParent = false;
        $state.go('app.browse');
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
        createUrl =  urlConfig.backend+'teacher/create';
      }
      delete data.choice;
      $http.post(createUrl,data).then(function(res) {
        console.log(res);
        if(res.statusText=='Created'){
          $scope.showAlert("Sign up succesful!");
          $state.go('app.browse');
        }
        else{
          $scope.showAlert("Oops, Error in signing you up!")
        }
      });

    }
  };
})

.controller('ChatsCtrl', function($scope, Chats, sessionService, classes, teachers, student) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});
  var userType = sessionService.get("loginData").userType;
  var ward;

  $scope.chatItems = [];
  if(userType=='Parent'){
    ward = sessionService.get("wards")[0].student;
    var wardClass = ward.class;
    classes.getTeachersOfClass(wardClass, function(data){
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
  }
  else {
    var loginData = sessionService.get("loginData");
    var user = loginData.model;
    var teacherId = loginData.model.id;
    teachers.getAllClassesOfTeacher(teacherId, function(data){
      data.forEach(function(element,index,array){
        classId = element.class.id;
        student.getStudentsOfClass(classId, function(students){
          students.forEach(function(val,i,a){
            student.getWardDataOfStudent(val.id,function(wards){
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

.controller('NoticeBoardCtrl', function($scope, noticeBoard, $state, $ionicModal, sessionService, classes){

  var userType = sessionService.get("loginData").userType;
  var ward;
  if(userType=='Parent'){
    ward = sessionService.get("wards")[0].student;
  }
  $scope.cls = [];
  $scope.notices = [];
  $scope.modalShow = false;
  classes.getAllClasses(function(cls)
  {
    $scope.cls = cls;
  });
  function updateNoticeBoard()
  {
    if(userType=='Teacher'){
      noticeBoard.getAllNotices(function(notices){
        $scope.notices = notices;
      });
    }
    else {
      noticeBoard.getNoticesOfClass(ward.class,function(notices){
        $scope.notices = notices;
      });
    }
  }
  updateNoticeBoard();

  $ionicModal.fromTemplateUrl('templates/modal.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.noticeModal = modal;
  })

  $scope.postMessage = function(announcement) {
    console.log(announcement);
    noticeBoard.postNotice(announcement);
    updateNoticeBoard();
    $scope.noticeModal.hide();
  }

  $scope.$on('$ionicView.enter', function(e) {
    updateNoticeBoard();
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
   teachers.getTeacherReviews(myId, function(data){
     $scope.reviews = data;
   });

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
       teachers.postReview(obj);
     }
     else {
       $scope.showAlert("Invalid student name entered!");
     }
   }
})

.controller('MyWardCtrl', function($scope, $state, $ionicModal, sessionService, student) {
  var userType = sessionService.get("loginData").userType;
  var ward;
  $scope.reviews = [];
  if(userType=='Parent'){
    ward = sessionService.get("wards")[0].student;
  }
  student.getWardReviews(ward,function(data){
    $scope.reviews = data;
  });
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
