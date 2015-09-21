angular.module('starter.controllers', ['ionic', 'starter.config','starter.services'])

.controller('AppCtrl', function($scope, $ionicModal, $ionicPopup, $timeout,$state, $http, urlConfig, sessionService, school) {

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
      $state.transitionTo('app.browse');
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

.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  }
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('NoticeBoardCtrl', function($scope, noticeBoard, $state, $ionicModal, sessionService, classes){

  $scope.cls = [];
  $scope.notices = [];
  classes.getAllClasses(function(cls)
  {
    $scope.cls = cls;
  });
  function updateNoticeBoard()
  {
    noticeBoard.getAllNotices(function(notices)
    {
      $scope.notices = notices;
      console.log(notices);
    });
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

  console.log(sessionService.get("loginData"));

})

.controller('StudentReviewCtrl', function($scope, $state, $ionicModal, sessionService, classes) {

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
