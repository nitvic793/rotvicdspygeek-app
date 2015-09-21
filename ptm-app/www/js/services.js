function genericGetAll($http, url, callback){
  $http.get(url).then(function(res){
      callback(res.data);
    },
    function(err){
      callback(null);
  });
}

angular.module('starter.services', ['ionic', 'ngCookies', 'starter.config'])

.factory('Chats', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'https://pbs.twimg.com/profile_images/514549811765211136/9SgAuHeY.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'https://avatars3.githubusercontent.com/u/11214?v=3&s=460'
  },{
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'https://pbs.twimg.com/profile_images/479090794058379264/84TKj_qa.jpeg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'https://pbs.twimg.com/profile_images/598205061232103424/3j5HUXMY.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'https://pbs.twimg.com/profile_images/578237281384841216/R3ae1n61.png'
  }];

  return {
    all: function() {
      return chats;
    },
    remove: function(chat) {
      chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < chats.length; i++) {
        if (chats[i].id === parseInt(chatId)) {
          return chats[i];
        }
      }
      return null;
    }
  };
})
.service('sessionService', ['$cookieStore', function ($cookieStore) {
    var localStoreAvailable = typeof (Storage) !== "undefined";
    this.store = function (name, details) {
        if (localStoreAvailable) {
            if (angular.isUndefined(details)) {
                details = null;
            } else if (angular.isObject(details) || angular.isArray(details) || angular.isNumber(+details || details)) {
                details = angular.toJson(details);
            };
            sessionStorage.setItem(name, details);
        } else {
            $cookieStore.put(name, details);
        };
    };

    this.persist = function(name, details) {
        if (localStoreAvailable) {
            if (angular.isUndefined(details)) {
                details = null;
            } else if (angular.isObject(details) || angular.isArray(details) || angular.isNumber(+details || details)) {
                details = angular.toJson(details);
            };
            localStorage.setItem(name, details);
        } else {
            $cookieStore.put(name, details);
        }
    };

    this.get = function (name) {
        if (localStoreAvailable) {
            return getItem(name);
        } else {
            return $cookieStore.get(name);
        }
    };

    this.destroy = function (name) {
        if (localStoreAvailable) {
            localStorage.removeItem(name);
            sessionStorage.removeItem(name);
        } else {
            $cookieStore.remove(name);
        };
    };

    var getItem = function (name) {
        var data;
        var localData = localStorage.getItem(name);
        var sessionData = sessionStorage.getItem(name);

        if (sessionData) {
            data = sessionData;
        } else if (localData) {
            data = localData;
        } else {
            return null;
        }

        if (data === '[object Object]') { return null; };
        if (!data.length || data === 'null') { return null; };

        if (data.charAt(0) === "{" || data.charAt(0) === "[" || angular.isNumber(data)) {
            return angular.fromJson(data);
        };

        return data;
    };

    return this;
}])

.factory('school', function($http, urlConfig, sessionService){
  var url = urlConfig.backend + "school"
  return {
    getAll: function(callback) {
      genericGetAll($http, url, callback);
    }
  }
})

.factory('noticeBoard', function($http, urlConfig, sessionService){
  var announcements = [];
  var url = urlConfig.backend+"noticeboard";
  var createUrl = urlConfig.backend+"noticeboard/create";
  return {
    postNotice: function(message){
      var user = sessionService.get("loginData");
      var classId = message.forClass.id;
      var notice = {
        teacher: user.model.id,
        class: classId,
        message: message.message,
        time: new Date()
      };
      $http.post(createUrl,notice)
      .error(function(data, status, headers, config) {
        console.log("Error in notice posting!");
      })
      .then(function(res){
        console.log('Notice posted! '+ res.data);
      });
    },
    getAllNotices : function (callback) {
      $http.get(url).then(function(res){
          callback(res.data);
        },
        function(err){
          callback(null);
        }
      );
    }
  };
})
.factory('classes', function($http, urlConfig){
  var classes = [];
  var url = urlConfig.backend+"class";
  return {
    getAllClasses : function (callback) {
      genericGetAll($http, url, callback);
    }
  };
})
.factory('student', function($http, urlConfig)
{
  var url = urlConfig.backend+"student";
  return {
    getAllStudents : function (callback) {
      genericGetAll($http, url, callback);
    }
  };
});
