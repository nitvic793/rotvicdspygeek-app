function guid(){
  var val = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
  return v.toString(16);
  });
  return val;
}

function isLoggedIn(sessionService){
  var data = sessionService.get("loginData");
  if(!data || !data.userType || !data.model){
    return false;
  }
  else{
    return true;
  }
}

function takeActionIfNotLoggedIn(sessionService, $state, $ionicHistory){
  if(!isLoggedIn(sessionService)){
    $ionicHistory.clearCache();
    $ionicHistory.clearHistory();
    $ionicHistory.nextViewOptions({
              disableBack: true
          });
    $state.go('app.login', {}, {reload: true});
    return true;
  }
  return false;
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

.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $ionicPopup, $cordovaPush, $ionicLoading, $timeout, $ionicHistory, $state, $http, urlConfig, sessionService, school, student, classes) {

  $scope.logout = function(){
    $rootScope.toggleDrag = false;
    sessionService.destroy("loginData");
    $ionicHistory.clearCache();
    $ionicHistory.clearHistory();
    $ionicHistory.nextViewOptions({
              disableBack: true
          });
    $state.go("app.login");
  }
  $rootScope.toggleDrag = false;
  $rootScope.officeHours = sessionService.get("officeHours");
  $scope.schools = [];
  school.getAll(function(data){
    $scope.schools = data;
  });
  $rootScope.isParent = true;


  // Form data for the login modal
  $scope.loginData = {
    userType:'Parent'
  };
  //Form data for the sign up page
  $scope.signUpData = {
    choice:'Parent'
  };
  $scope.message = '';
  $scope.showAlert = function(message) {
    var alertPopup = $ionicPopup.alert({
      title: 'Message',
      template: message
    });
    alertPopup.then(function(res) {
      console.log('Alert shown');
    });
  }
  if(sessionService.get("loginData")!=null){
    $http.defaults.headers.common.Authorization = "Bearer " + sessionService.get("loginData").token;
  }

})
.controller('LoginCtrl', function($rootScope, $scope, $ionicModal, $ionicPopup, $ionicLoading, $timeout, $ionicHistory, $state, $http, urlConfig, sessionService, school, student, classes, teachers, parents) {

  var push = new Ionic.Push({
    "debug": true,
    "onNotification": function(notification) {
      var payload = notification.payload;
      console.log(notification, payload);

    },
    "onRegister": function(data) {
      console.log(data.token);
    }
  });

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
    $ionicLoading.show();
    $ionicHistory.nextViewOptions({
              disableBack: true
          });
    console.log('Doing login', $scope.loginData);
    var loginUrl = urlConfig.backend+"auth";
    $http.post(loginUrl,$scope.loginData)
    .error(function(data, status, headers, config) {
      console.log(data,status,headers,config);
      $scope.showAlert('Error in logging in: ' + data.err);
      $ionicLoading.hide();
    })
    .then(function(res){
      $rootScope.toggleDrag = true;
      console.log(res);
      sessionService.persist("loginData",res.data);
      $http.defaults.headers.common.Authorization = "Bearer " + res.data.token;
      if(res.data.model.settings && isOfficeHours(res.data.model.settings)){
        $scope.officeHours = true;
      }
      if(res.data.userType=="Parent"){
        if(true){//!res.data.model.pushToken){//hack
          push.register(function(pushToken){
            console.log(pushToken);
            res.data.model.pushToken = pushToken.token;
            parents.updateParent(res.data.model,function(){},function(){
              console.log("Could not register for push notification");
            });
          });
        }
        student.getWardsOfParent(res.data.model,function(data){
          sessionService.persist("wards", data);
          $rootScope.isParent = true;
          console.log(data);

          if(!data || data.length==0){
            $state.go('app.addWard');
          }
          else{
            $state.go('app.browse',{}, {reload: true});
          }
          $ionicLoading.hide();
        });
      }
      else {
        if(true){//!res.data.model.pushToken){ //Hack
          push.register(function(pushToken){
            console.log(pushToken);
            res.data.model.pushToken = pushToken.token;
            teachers.updateTeacher(res.data.model,function(){},function(){
              console.log("Could not register for push notification");
            });
          });
        }
        classes.getSubjectsOfTeacher(res.data.model.id, function(data){
          $rootScope.isParent = false;

          if(!data || data.length==0){
            $state.go('app.addSubject');
          }
          else{
            $state.go('app.browse',{}, {reload: true});
          }
          $ionicLoading.hide();
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
    $ionicLoading.show();
      if(form.$valid)
      {
        var data = $scope.signUpData;
        var createUrl = '';
        var choice = $scope.signUpData.choice;
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
        $http.post(createUrl,data)
        .error(function(data, status, headers, config) {
          console.log(data,status,headers,config);
          $scope.showAlert("Oops, Error in signing you up!");
          $ionicLoading.hide();
        })
        .then(function(res) {
          console.log(res);
          if(res.data.statusText=='Created'){
            $scope.showAlert("Sign up succesful!");
            push.register(function(token){
              obj = res.data;
              console.log(obj.id.toString());
              obj.pushToken = token.token;
              if(choice=='Parent'){
                parents.updateParent(obj,function(){
                  console.log("Registered for push! " + token.token);
                },
                function(){
                  console.log("Error in updating to DB");
                });
              }
              else{
                teachers.updateTeacher(obj,function(){
                  console.log("Registered for push! " + token.token);
                },
                function(){
                  console.log("Error in updating to DB");
                });
              }
            });
            $state.go('app.login');
          }
          else{
            $scope.showAlert("Oops, Error in signing you up!");
          }
          $ionicLoading.hide();
        });
      }
      else{
        $scope.showAlert("Please fill the sign up form with appropriate values");
      }
  };

})
.controller('ChatsCtrl', function($scope, $state, $ionicModal, Chats, sessionService, classes, teachers, student,parents, $ionicLoading) {
  var userType = sessionService.get("loginData").userType;
  var myId = sessionService.get("loginData").model.id;
  var myUserId = sessionService.get("loginData").user.id;
  var ward;
  $scope.chatItems = [];

  function getUserChats(){
    var items = sessionService.get("chatUsers_"+myId);
    if(items!=null){
      items.forEach(function(val,index,array){
        $scope.chatItems.push({
          id:val.user.id,
          name:val.firstname + ' ' + val.lastname,
        });
      });
    }
  }
  getUserChats();
  $ionicModal.fromTemplateUrl('templates/chatContactsModal.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.contactsModal = modal;
  });

  $ionicModal.fromTemplateUrl('templates/addGroupModal.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.addGroupModal = modal;
  });

  $ionicModal.fromTemplateUrl('templates/addChatContactModal.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.addChatContactModal = modal;
  });

  var schoolId = sessionService.get("loginData").model.school;


  $scope.groupList = [];
  $scope.group = {};

  $scope.createGroup = function(){
    if(!$scope.group.groupName || $scope.group.groupName == ''){
      $scope.showAlert("Please enter group name");
      return;
    }
    if($scope.groupList.length==0){
      $scope.showAlert("Number of members in group has to be more than one(1)");
      return;
    }
    $ionicLoading.show();
    var memberIds = [myUserId];
    for(var i=1;i<$scope.groupList.length+1;++i){
      memberIds[i] = $scope.groupList[i-1].user.id;
    }
    var group = {
      groupOwner: myUserId,
      users: memberIds,
      groupName: $scope.group.groupName
    };
    Chats.createGroup(group,
      function onError(){
        $ionicLoading.hide();
        $scope.showAlert("Could not create group");
      },
      function onSuccess(){
        $ionicLoading.hide();
        $scope.showAlert("Group created!");
        $scope.addGroupModal.hide();
        loadGroups();
    });
    $scope.groupList = [];
  }
  function containsUser(items, user, cb){
      for(var i=0;i<items.length;++i){
        if(items[i].id == user.id){
          cb(true);
          return;
        }
      }
      cb(false);
  }

  $scope.addUserToList = function(item){
    var items = sessionService.get("chatUsers_"+myId);
    if(items==null){
      items = [];
    }
    containsUser(items,item,function(contains){
      if(!contains){
        items.push(item);
        sessionService.persist("chatUsers_"+myId,items);
        console.log("Added");
      }
    });
  }

  $scope.chatNavigate = function(item){
    console.log(item);
    if(item.isGroup){
      $state.go("app.groupChat",{groupId:item.id});
    }
    else{
      $state.go("app.chat-detail",{chatId:item.id});
    }
  }
  function loadGroupsCache(){
    groups = sessionService.get("groups_"+myId);
    if(groups!=null)
    {
        groups.forEach(function(val,index,array){
        var obj = {
          id:val.id,
          name:val.groupName,
          isGroup:true
        };
        console.log(obj);
        $scope.chatItems.push(obj);
      });
    }
  }
  function contains(obj,array){
    for(var i=0;i<array.length;++i){
      if(obj.id==array[i].id){
        return true;
      }
    }
    return false;
  }
  loadGroupsCache();
  function loadGroups(){
    //$ionicLoading.show();
    var groupsCache = sessionService.get("groups_"+myId);
    Chats.getMyGroups(function(groups){
      groups.forEach(function(val,index,array){
        var obj = {
          id:val.id,
          name:val.groupName,
          isGroup:true
        };
        if(!contains(obj,groups)){
          $scope.chatItems.push(obj);
        }
        console.log(obj);
      });
      //$ionicLoading.hide();
      sessionService.persist("groups_"+myId,groups);
    });
  }

  loadGroups();

  $scope.addToList = function(item){
    console.log(item);
    $scope.groupList.push(item);
  }

  $scope.search = {};
  $scope.onSearchChange = function () {
    if($scope.search.name){
      var str = $scope.search.name.split(' ');
      $scope.searchCriteria = { };
      $scope.searchCriteria.firstname = str[0];
      if(str[1])
      $scope.searchCriteria.lastname = str[1];
    }
    else{
      $scope.searchCriteria = {};
    }
  }
  $scope.parents = [];
  $scope.teachers = [];
  $scope.groups = [];
  parents.getAllParentsOfSchool(schoolId, function(data){
    var filtered = [];
    for(var i=0;i<data.length;++i){
      if(data[i].id != myId){
        filtered[i] = data[i];
      }
    }
    $scope.parents = filtered;
    $scope.groups[1] = {name: "Parents",
        items: $scope.parents};
    sessionService.persist("parents",filtered);
    console.log(data);
  });

  teachers.getAllTeachersOfSchool(schoolId, function(data){
    var filtered = [];
    for(var i=0;i<data.length;++i){
      if(data[i].id != myId){
        filtered[i] = data[i];
      }
    }
    $scope.teachers = filtered;
    sessionService.persist("teachers",filtered);
    $scope.groups[0] = {name: "Teachers",
        items: $scope.teachers};
    console.log(data);
  });

 /*
  * if given group is the selected group, deselect it
  * else, select the given group
  */
 $scope.toggleGroup = function(group) {
   if ($scope.isGroupShown(group)) {
     $scope.shownGroup = null;
   } else {
     $scope.shownGroup = group;
   }
 };
 $scope.isGroupShown = function(group) {
   return $scope.shownGroup === group;
 };

})

.controller('ChatDetailCtrl', function($scope, $stateParams, $ionicScrollDelegate, Chats, sessionService, parents, teachers) {
  $scope.hideTime = true;
  var userType = sessionService.get("loginData").userType;
  var alternate, isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();
  $scope.messages = [];
  $scope.userData = {};
  $scope.myId = sessionService.get("loginData").user.id;
  var userId = $stateParams.chatId; //Get user Id of who we are going to chat with
  var teacherId,parentId;
  var chatItems = sessionService.get("chats");
  if(!chatItems){
    chatItems = [];
  }
  chatItems[userId] = {user:userId};
  sessionService.persist("chats",chatItems);

  function getUserData(){
    var chatUser =  Chats.getUserFromCache(userId);
    if(chatUser){
      $scope.userData = chatUser;
    }
  }
  getUserData();
  var socketId;
  function registerSocket(){
    io.socket.get("/chats/getSocketId", function(resData, jwres) {
      console.log(resData);
      socketId = resData.socketId;
      io.socket.post('/chats/registerSocket', { userId: $scope.myId, socketId:socketId }, function (resData) {
        console.log("Status", resData.status);
        console.log(resData.status);
        console.log("Socket Id "+ socketId);
      });
    });
  }
  registerSocket();
  io.socket.on("connect", function onConnect(){
    registerSocket();
    getLatestChats();
  });

  function getLatestChats(cb){
    //sessionService.destroy(userId);
    if(sessionService.get($scope.myId+'_'+userId)!=null){
      $scope.messages = sessionService.get(userId);
    }
    var skip = 0;
    if($scope.messages!=null){
      skip = $scope.messages.length;
    }
    else{
      $scope.messages = [];
    }
    Chats.getChats($scope.myId,userId,skip, function(data){
      data.forEach(function (val,i,a) {
        obj = {
          userId: val.from.id,
          text: val.message,
          time: new Date(val.time).toLocaleTimeString().replace(/:\d+ /, ' ')
        };
        $scope.messages.push(obj);
        sessionService.persist($scope.myId+'_'+userId,$scope.messages);
      });
      if(cb){
        cb();
      }
      if(data.length!=0){
        $ionicScrollDelegate.scrollBottom(true);
      }
    });
  }
  io.socket.on('message', function(msg){
    console.log("Chat message received via Socket");
    console.log("Socket", msg);
    var obj = {
      userId: msg.from.id,
      text: msg.message,
      time: new Date(msg.time).toLocaleTimeString().replace(/:\d+ /, ' ')
    };
    $scope.messages.push(obj);
    $scope.$apply();
    sessionService.persist($scope.myId+'_'+userId, $scope.messages);
    $ionicScrollDelegate.scrollBottom(true);

  });

  getLatestChats(function(){
    $ionicScrollDelegate.scrollBottom(true);
  });

  $scope.sendMessage = function() {
    var d = new Date();
    d = d.toLocaleTimeString().replace(/:\d+ /, ' ');
    Chats.sendChat({
      from: $scope.myId,
      to:userId ,
      message:$scope.data.message,
      time:new Date()
    }, function onError(){
      $scope.showAlert("Could not send message. " + data.err);
    }, function onSuccess(){

    }
    );
    obj = {
      userId: $scope.myId,
      text: $scope.data.message,
      time: d
    };
    $scope.messages.push(obj);
    $ionicScrollDelegate.scrollBottom(true);
    $scope.data.message = "";
    console.log(obj);
  }

})
.controller('GroupChatCtrl', function($scope, $stateParams, $ionicScrollDelegate, Chats, sessionService) {

  $scope.hideTime = true;
  var userType = sessionService.get("loginData").userType;
  var alternate, isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();
  $scope.messages = [];
  $scope.myId = sessionService.get("loginData").user.id;
  var modelId = sessionService.get("loginData").model.id;
  var groupId = $stateParams.groupId;
  $scope.data = {};
  var socketId;
  var currentUserName = sessionService.get("loginData").model.firstname + " " + sessionService.get("loginData").model.lastname;
  function getUserFromCache(userId){
    var parents = sessionService.get("parents");
    var teachers = sessionService.get("teachers");
    if(parents){
      for(var i=0;i<parents.length;++i){
        if(parents[i]==null)continue;
        if(parents[i].user.id==userId){
          return parents[i];
        }
      }
    }
    if(teachers){
      for(var i=0;i<teachers.length;++i){
        if(teachers[i]==null)continue;
        if(teachers[i].user.id==userId){
          return teachers[i];
        }
      }
    }
    if(sessionService.get("loginData").user.id == userId){
      return sessionService.get("loginData").model;
    }
    return null;
  }

  function getGroupName(groupId){
    var groups = sessionService.get("groups_"+modelId);
    for(var i=0;i<groups.length;++i){
      if(groups[i].id==groupId){
        return groups[i].groupName;
      }
    }
  }
  $scope.group = {groupName:getGroupName(groupId)};
  function registerSocket(){
    io.socket.get("/chats/getSocketId", function(resData, jwres) {
      console.log(resData);
      socketId = resData.socketId;
      io.socket.post('/chats/registerSocket', { userId: $scope.myId, socketId:socketId }, function (resData) {
        console.log("Status", resData.status);
        console.log("Socket Id "+ socketId);
      });
    });
  }
  registerSocket();
  io.socket.on("connect", function onConnect(){
    registerSocket();
    getLatestChats();
  });

  io.socket.on('groupMessage', function(msg){
    console.log("Chat message received via Socket");
    console.log("Socket", msg);
    if(msg.from==$scope.myId){
      return;
    }
    var user = getUserFromCache(msg.from);
    console.log(user);
    var obj = {
      name:user.firstname+' '+user.lastname,
      userId: msg.from.id,
      text: msg.message,
      time: new Date(msg.time).toLocaleTimeString().replace(/:\d+ /, ' ')
    };
    $scope.messages.push(obj);
    $scope.$apply();
    sessionService.persist(groupId, $scope.messages);
    $ionicScrollDelegate.scrollBottom(true);
  });

  function getLatestChats(cb){
    sessionService.destroy(groupId);
    if(sessionService.get(groupId)!=null){
      $scope.messages = sessionService.get(groupId);
      if($scope.messages){
        var messages = $scope.messages;
        for(var i=0;i<messages.length;++i){
            var user = getUserFromCache(messages[i].userId);
            if(messages[i].userId)
            messages[i].name = user.firstname+' '+user.lastname;
        }
      }
    }
    var skip = $scope.messages.length;
    Chats.getGroupChat(groupId,skip, function(data){
      console.log(data);
      data.forEach(function (val,i,a) {
        var user = getUserFromCache(val.from.id);
        obj = {
          name:user.firstname+' '+user.lastname,
          userId: val.from.id,
          text: val.message,
          time: new Date(val.time).toLocaleTimeString().replace(/:\d+ /, ' ')
        };
        $scope.messages.push(obj);
        sessionService.persist(groupId,$scope.messages);
      });
      if(cb){
        cb();
      }
      if(data.length!=0){
        $ionicScrollDelegate.scrollBottom(true);
      }
    });
  }
  getLatestChats(function(){
    $ionicScrollDelegate.scrollBottom(true);
  });

  $scope.sendMessage = function() {
    var d = new Date();
    d = d.toLocaleTimeString().replace(/:\d+ /, ' ');
    Chats.sendGroupChat({
      from: $scope.myId,
      group:groupId,
      message:$scope.data.message,
      time:new Date()
    }, function onError(){
      $scope.showAlert("Could not send message. " + data.err);
    }, function onSuccess(){
      console.log("Group message sent!");
    }
    );
    obj = {
      name:currentUserName,
      userId: $scope.myId,
      text: $scope.data.message,
      time: d
    };
    $scope.messages.push(obj);
    $ionicScrollDelegate.scrollBottom(true);
    $scope.data.message = "";
    console.log(obj);
  }

})
.controller('NoticeBoardCtrl', function($rootScope, $scope, $http, noticeBoard, $state, $ionicModal,$cordovaCamera,$ionicLoading, $ionicHistory, sessionService, classes, student, urlConfig, images){
  if(sessionService.get("loginData")==null){
    $state.go("app.login");
    return;
  }
  else{
    //Need to check token expiration and ask for re login if needed
  }

  $http.defaults.headers.common.Authorization = "Bearer " + sessionService.get("loginData").token;
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
    options.fileName = guid() + fileURL.substr(fileURL.lastIndexOf('/') + 1);

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
        if(!results || results.length == 0){
          $ionicLoading.hide();
          return; //No image selected
        }
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
        $ionicLoading.hide();
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
  function getRecentTime(notices){
    var time = notices[0].createdAt;
    for(var i=0;i<notices.length;++i){
      if(new Date(time)<new Date(notices[i].createdAt)){
        time = notices[i].createdAt;
      }
    }
    return time;
  }
//  sessionService.destroy("notices"+model.id);
  function updateNoticeBoard(){
    //$ionicLoading.show();
    $scope.notices = [];
    $scope.noticeImages = [];
    userType = sessionService.get("loginData").userType;
    model = sessionService.get("loginData").model;
    console.log("Getting notice board: " + userType);
    console.log("UserId: "+ model.id);
    var cacheNotices = sessionService.get("notices"+model.id);
    var skip = 0;
    if(cacheNotices!=null){
      var time = getRecentTime(cacheNotices);
      $scope.notices = cacheNotices;
      if(userType=='Teacher'){
        noticeBoard.getNoticesAfter(time,function(notices){
          if(notices==null){
            $scope.showAlert("Unable to update noticeboard! Check network connection");
          }
          for(var i=0;i<notices.length;++i){
            $scope.notices.push(notices[i]);
          }
          getImages($scope.notices);
          sessionService.store("notices"+model.id,$scope.notices);
          $scope.$broadcast('scroll.refreshComplete');
        });
      }
      else {
        for(i=0;i<wards.length;++i){
          var val = wards[i];
          noticeBoard.getNoticesAfterOfClass(time,val.student.class,function(notices){
            if(notices==null){
              $scope.showAlert("Unable to update noticeboard! Check network connection");
            }
            for(var i=0;i<notices.length;++i){
              $scope.notices.push(notices[i]);
            }
            getImages($scope.notices);
            $ionicLoading.hide();
            $scope.$broadcast('scroll.refreshComplete');
            $scope.notices.sort(function(a,b){
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
            sessionService.store("notices"+model.id,$scope.notices);
          });
        }
      }
      return;
    }
    if(userType=='Teacher'){
      noticeBoard.getAllNotices(function(notices){
        if(notices==null){
          $scope.showAlert("Unable to update noticeboard! Check network connection");
        }
        for(var i=0;i<notices.length;++i){
          $scope.notices.push(notices[i]);
        }
        getImages($scope.notices);
        sessionService.store("notices"+model.id,$scope.notices);
        $scope.$broadcast('scroll.refreshComplete');
      },0);
    }
    else {
      for(i=0;i<wards.length;++i){
        var val = wards[i];
        noticeBoard.getNoticesOfClass(val.student.class,function(notices){
          if(notices==null){
            $scope.showAlert("Unable to update noticeboard! Check network connection");
          }
          for(var i=0;i<notices.length;++i){
            $scope.notices.push(notices[i]);
          }
          getImages($scope.notices);
          $ionicLoading.hide();
          $scope.$broadcast('scroll.refreshComplete');
          $scope.notices.sort(function(a,b){
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          sessionService.store("notices"+model.id,$scope.notices);
        },0);
      }
    }
  }

  function updateNoticeBoardWithLoader(){
    $ionicLoading.show();
    $scope.notices = [];
    $scope.noticeImages = [];
    userType = sessionService.get("loginData").userType;
    model = sessionService.get("loginData").model;
    console.log("Getting notice board: " + userType);
    console.log("UserId: "+ model.id);
    var cacheNotices = sessionService.get("notices"+model.id);
    var skip = 0;
    if(cacheNotices!=null){
      var time = getRecentTime(cacheNotices);
      $scope.notices = cacheNotices;
      if(userType=='Teacher'){
        noticeBoard.getNoticesAfter(time,function(notices){
          $ionicLoading.hide();
          if(notices==null){
            $scope.showAlert("Unable to update noticeboard! Check network connection");
            return;
          }
          for(var i=0;i<notices.length;++i){
            $scope.notices.push(notices[i]);
          }
          getImages($scope.notices);
          sessionService.store("notices"+model.id,$scope.notices);
          $scope.$broadcast('scroll.refreshComplete');
        });
      }
      else {
        for(i=0;i<wards.length;++i){
          var val = wards[i];
          noticeBoard.getNoticesAfterOfClass(time,val.student.class,function(notices){
            $ionicLoading.hide();
            if(notices==null){
              $scope.showAlert("Unable to update noticeboard! Check network connection");
              return;
            }
            for(var i=0;i<notices.length;++i){
              $scope.notices.push(notices[i]);
            }
            getImages($scope.notices);
            $scope.$broadcast('scroll.refreshComplete');
            $scope.notices.sort(function(a,b){
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
            sessionService.store("notices"+model.id,$scope.notices);
          });
        }
      }
      return;
    }
    if(userType=='Teacher'){
      noticeBoard.getAllNotices(function(notices){
        $ionicLoading.hide();
        if(notices==null){
          $scope.showAlert("Unable to update noticeboard! Check network connection");
          return;
        }
        else{
          for(var i=0;i<notices.length;++i){
            $scope.notices.push(notices[i]);
          }
        }
        getImages($scope.notices);
        sessionService.store("notices"+model.id,$scope.notices);
        $scope.$broadcast('scroll.refreshComplete');
      }, 0);
    }
    else {
      for(i=0;i<wards.length;++i){
        var val = wards[i];
        noticeBoard.getNoticesOfClass(val.student.class,function(notices){
          $ionicLoading.hide();
          if(notices==null){
            $scope.showAlert("Unable to update noticeboard! Check network connection");
            return;
          }
          for(var i=0;i<notices.length;++i){
            $scope.notices.push(notices[i]);
          }
          getImages($scope.notices);
          $scope.$broadcast('scroll.refreshComplete');
          $scope.notices.sort(function(a,b){
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          sessionService.store("notices"+model.id,$scope.notices);
        },0);
      }
    }
  }

  $scope.refresh = updateNoticeBoard;
  $scope.doRefresh = updateNoticeBoard;
  //updateNoticeBoard();

  $ionicModal.fromTemplateUrl('templates/modal.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.noticeModal = modal;
  })

  $scope.postMessage = function(announcement) {
    announcement.images = $scope.imageFiles;
    console.log(announcement);
    if(!announcement.forClass){
      $scope.showAlert("Please specify a class");
      return;
    }
    $ionicLoading.show();
    noticeBoard.postNotice(announcement, function(err){
      $scope.showAlert(err);
      $ionicLoading.hide();
    }, function(){
      $ionicLoading.hide();
      $scope.noticeModal.hide();
      updateNoticeBoardWithLoader();
    });
  }

    $scope.$on('$ionicView.enter', function(e) {
      if(userType=='Parent'){
        wards = sessionService.get("wards");
        console.log("Updating notice board");
        if(!wards || wards.length==0){
        student.getWardsOfParent(model,function(data){
          wards = data;
            updateNoticeBoardWithLoader();
          });
        }
        else{
            updateNoticeBoardWithLoader();
        }
      }
      else {
          updateNoticeBoardWithLoader();
      }
    });

})

.controller('StudentReviewCtrl', function($scope, $state, $ionicModal,$ionicLoading, $ionicPopup, sessionService, classes, student, teachers) {
  //Need to add search students mechanism
  $scope.review = {};
  $scope.reviews = [];
  $scope.search = {};
  $ionicModal.fromTemplateUrl('templates/studentListView.html', function(modal) {
     $scope.modal = modal;
   }, {
     scope: $scope,
     animation: 'slide-in-up',
     focusFirstInput:true
   });
   $scope.studentReviewModal = "";
   $ionicModal.fromTemplateUrl('templates/postStudentReviewModal.html', function(modal) {
      $scope.studentReviewModal = modal;
    }, {
      scope: $scope,
      animation: 'slide-in-up'
    });
   var myId = sessionService.get("loginData").model.id;

   function updateReviews(){
     $ionicLoading.show();
     teachers.getTeacherReviews(myId, function(data){
       $scope.reviews = data;
       $scope.$broadcast('scroll.refreshComplete');
       console.log("Reviews updated");
       $ionicLoading.hide();

     });
   }
   $scope.doRefresh = updateReviews();
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

   $scope.onSearchChange = function(){
     if($scope.search.student.firstName){
       var str = $scope.search.student.firstName.split(' ');
       $scope.searchCriteria = { student : {}};
       $scope.searchCriteria.student.firstName = str[0];
       if(str[1])
       $scope.searchCriteria.student.lastName = str[1];
     }
     else{
       $scope.searchCriteria = {};
     }
   }

   $scope.onClickList = function(model){
     $scope.modal.hide();
     $scope.review.model = model;
     $scope.review.studentName = model.firstName + ' ' + model.lastName;
   }

   $scope.postReview = function(){
     $ionicLoading.show();
     var obj = {
       teacher: sessionService.get("loginData").model,
       student: $scope.review.model,
       review: $scope.review.comments
     };
     if($scope.review.model){
       teachers.postReview(obj, function(data){
            updateReviews();
            $scope.review.comments = "";
            $scope.studentReviewModal.hide();
            $ionicLoading.hide();
       });
     }
     else {
       $ionicLoading.hide();
       $scope.showAlert("Invalid student name entered!");
     }
   }
})

.controller('MyWardCtrl', function($scope, $state, $ionicModal,$ionicLoading, sessionService, student) {
  var userType = sessionService.get("loginData").userType;
  $scope.wards = [];
  $scope.reviews = [];
  $scope.getReviews = function(ward){
    student.getWardReviews(ward.student,function(data){
      $scope.reviews = data;
      $ionicLoading.hide();
    });
  }

  if(userType=='Parent'){
    $ionicLoading.show();
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
.controller('MenuCtrl', function($rootScope, $scope, $stateParams, sessionService) {

  if(sessionService.get("loginData")!=null){
    $scope.isLoggedIn = true;
    if(sessionService.get("loginData").userType=="Parent"){
      $rootScope.isParent = true;
    }
    else{
      $rootScope.isParent = false;
    }
  }
  else{
    $scope.isLoggedIn = false;
  }


})
.controller('LogoutCtrl', function($scope, $stateParams, $ionicHistory, $state, sessionService) {
  sessionService.destroy("loginData");
  $ionicHistory.clearCache();
  $ionicHistory.clearHistory();
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
      if(!data || data.length==0){
        checkWard();
      }
    });
  }
  loadWards();
  //checkWard();
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
.controller('SettingsCtrl', function($scope, $rootScope, $stateParams, sessionService, teachers, parents) {
  $scope.currentOfficeHours = {};
  if(sessionService.get("officeHours")!=null){
    console.log(sessionService.get("officeHours"));
    $scope.currentOfficeHours.checked = sessionService.get("officeHours");
    $rootScope.officeHours = sessionService.get("officeHours");
  }
  console.log($scope.currentOfficeHours);
  $scope.isParent = isCurrentUserAParent(sessionService);
  settings = sessionService.get("loginData").model.settings;
  if(settings && isOfficeHours(settings)){
    $rootScope.officeHours = true;
  }
  $scope.saveOfficeHours = function(){
    console.log($scope.currentOfficeHours.checked);
    sessionService.store("officeHours", $scope.currentOfficeHours.checked);
    $rootScope.officeHours = $scope.currentOfficeHours.checked;
    var model = sessionService.get("loginData").model;
    var userType = sessionService.get("loginData").userType;
    model.officeHours = $rootScope.officeHours;
    if(userType=="Parent"){
      parents.updateParent(model,function(){
        console.log("office Hours saved!");
      },
      function(){
        console.log("Could not save office hour");
      });
    }
    else{
      teachers.updateTeacher(model,function(){
        console.log("office Hours saved!");
      },
      function(){
        console.log("Could not save office hour");
      });
    }
  }
  console.log($rootScope.officeHours);

})
.controller('AddSubjectCtrl', function($scope, $stateParams,$ionicModal, $ionicActionSheet,$ionicLoading, $timeout,sessionService, student, classes) {
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
     $ionicLoading.show();
     $scope.subjects = [];
     classes.getSubjectsOfTeacher(model.id, function(data){
       data.forEach(function(val,i,a){
         $scope.subjects.push(val);
         checkSubjects();
         $ionicLoading.hide();
       });
       if(!data || data.length==0){
         checkSubjects();
         $ionicLoading.hide();
       }
     });
   }
   loadSubjects();
   loadClasses();
   //checkSubjects();

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
.controller('FeedbackCtrl', function($scope,feedback,sessionService, $stateParams) {
  $scope.feedback = {};
  $scope.sendFeedback = function(){
    if($scope.feedback.text!=null && $scope.feedback.text!="") {
      var obj = {
        feedback:$scope.feedback.text,
        user:sessionService.get("loginData").user.id
      };
      feedback.postFeedback(obj,function(data){
        $scope.feedback.text = "";
        $scope.showAlert("Feedback submitted!");
      },function(data){
        $scope.showAlert("Could not submit feedback. Check internet connection");
      });
    }
    else{
      $scope.showAlert("Feedback text cannot be empty!")
    }
  }
})
.controller('PasswordCtrl', function($scope, $ionicLoading, $stateParams,sessionService, user) {
  $scope.user = {
    email: sessionService.get("loginData").user.email
  };
  $scope.changePassword = function(){
    $ionicLoading.show();
    user.changePassword($scope.user, function(data){
      $ionicLoading.hide();
      if(!data.err){
        $scope.showAlert(data.status);
      }
      else{
        $scope.showAlert("Error: " + data.err);
      }
    },
    function(data){
        $ionicLoading.hide();
        $scope.showAlert("Error in updating password");
    });
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
