function genericGetAll($http, url, callback){
  $http.get(url).then(function(res){
      callback(res.data);
    },
    function(err){
      callback(null);
  });
}

angular.module('starter.services', ['ionic', 'ngCookies', 'starter.config'])

.factory('Chats', function($http, urlConfig) {
  var url = urlConfig.backend+"chat";
  return {
    getChats: function (teacherId, parentId,skip, callback) {
      var getUrl = url+"?teacher="+teacherId+"&parent="+parentId+"&skip="+skip;
      genericGetAll($http,getUrl,callback);
    },
    sendChat : function (chatObj) {
      console.log(chatObj);
      var createUrl = url+"/create";
      $http.post(createUrl,chatObj)
      .error(function(data, status, headers, config) {
        console.log("Error in sending message!");
      })
      .then(function(res){
        console.log('Message sent! '+ res.data);
      });
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
    },
    update: function(who,model,errCb,successCb){
      updateUrl = urlConfig.backend+who+"/update/"+model.id;
      $http.post(updateUrl,model)
        .error(function(data, status, headers, config) {
          console.log("Error in update");
          errCb();
        })
        .then(function(res){
          console.log('Updated! '+ res.data);
          successCb();
        });
      }
    }
})

.factory('noticeBoard', function($http, urlConfig, sessionService){
  var announcements = [];
  var url = urlConfig.backend+"noticeboard";
  var createUrl = urlConfig.backend+"noticeboard/create";
  return {
    postNotice: function(message,errCb,successCb){
      var user = sessionService.get("loginData");
      var classId = message.forClass.id;
      var notice = {
        teacher: user.model.id,
        class: classId,
        message: message.message,
        time: new Date(),
        images:message.images
      };
      $http.post(createUrl,notice)
      .error(function(data, status, headers, config) {
        console.log("Error in notice posting!");
        errCb(data);
      })
      .then(function(res){
        console.log('Notice posted! '+ res.data);
        successCb();
      });
    },
    getAllNotices : function (callback) {
      var getUrl = url+"/?sort=createdAt DESC";
      $http.get(getUrl).then(function(res){
          callback(res.data);
        },
        function(err){
          callback(null);
        }
      );
    },
    getNoticesOfClass: function(classId, callback){
      var classUrl = url+"/?sort=createdAt DESC&class="+classId;
      genericGetAll($http,classUrl,callback);
    }
  };
})
.factory('classes', function($http, urlConfig){
  var classes = [];
  var url = urlConfig.backend+"class";
  return {
    getAllClasses : function (callback) {
      genericGetAll($http, url, callback);
    },
    getTeachersOfClass: function(cls, callback){
      var getUrl = urlConfig.backend+"subjectTeacher?class="+cls;
      genericGetAll($http,getUrl,callback);
    },
    getAllSubjects : function(callback){
      var getUrl = urlConfig.backend+"subject";
      genericGetAll($http,getUrl,callback);
    },
    getSubjectsOfTeacher: function(teacherId, callback){
      var getUrl = urlConfig.backend+"subjectteacher?teacher="+teacherId;
      genericGetAll($http,getUrl,callback);
    },
    getSubjectsLike: function(subject,callback){
      var getUrl = urlConfig.backend + 'subject?where={"subjectName":{"contains":"'+subject+'"}}';
      genericGetAll($http,getUrl,callback);
    },
    createSubjectTeacher: function(model,callback){
      var createUrl = urlConfig.backend+'subjectteacher/create';
      $http.post(createUrl,model)
      .error(function(data, status, headers, config) {
        console.log("Error in creating subject teacher relation!",data);
        callback(data);
      })
      .then(function(res){
        console.log('Subject teacher relation created! ',res.data);
        callback(res.data);
      });
    },
    removeSubjectTeacher: function(id,callback){
      var deleteUrl = urlConfig.backend+"subjectteacher?id="+id;
      $http.delete(deleteUrl).then(function(res){
          callback(res);
      },
      function(err){
        callback(null);
      }
    );
    }
  };
})
.factory('teachers', function($http, urlConfig){
  var classes = [];
  var url = urlConfig.backend+"teachers";
  return {
    getAllClassesOfTeacher : function (teacher,callback) {
      var getUrl = urlConfig.backend+"subjectteacher?teacher="+teacher;
      genericGetAll($http, getUrl, callback);
    },
    getTeacher : function (id,callback) {
      getUrl = url+"/"+id;
      genericGetAll($http, getUrl, callback);
    },
    getTeacherReviews: function(teacherId, callback){
      getUrl = urlConfig.backend + "studentreview?sort=createdAt DESC&teacher="+teacherId;
      genericGetAll($http, getUrl, callback);
    },
    postReview: function(review, callback){
      createUrl = urlConfig.backend + "studentreview/create";
      $http.post(createUrl,review)
      .error(function(data, status, headers, config) {
        console.log("Error in posting review!");
        callback(data);
      })
      .then(function(res){
        console.log('Review posted! '+ res.data);
        callback(res.data);
      });
    }
  };
})
.factory('parents', function($http, urlConfig){
  var classes = [];
  var url = urlConfig.backend+"parents";
  return {
    getParent: function (id,callback) {
      var getUrl = url+"/"+id;
      genericGetAll($http, getUrl, callback);
    }
  };
})
.factory('images', function($http, urlConfig){
  var url = urlConfig.backend+"image";
  return {
    getImage: function (name,callback) {
      var getUrl = url+"?name="+name;
      genericGetAll($http, getUrl, callback);
    }
  };
})
.factory('student', function($http, urlConfig)
{
  var url = urlConfig.backend+"student";
  return {
    getAllStudents : function (callback) {
      genericGetAll($http, url, callback);
    },
    getStudentsLike: function(name,callback){
      name = name.split(' ');
      if(!name[1]){
        name[1] = '';
      }
      var getUrl = url+'?where={"firstName":{"contains":"'+name[0]+'"},%20"lastName":{"contains":"'+name[1]+'"}}';
      genericGetAll($http, getUrl, callback);
    },
    getStudentsOfClass : function(cls,callback){
      getUrl = url+'?class='+cls;
      genericGetAll($http, getUrl, callback);
    },
    getWardDataOfStudent : function (studentId,callback) {
      var wardUrl = urlConfig.backend+"wardrelation/?student="+studentId;
      genericGetAll($http,wardUrl,callback);
    },
    getWardsOfParent: function(parent, callback){
      var wardUrl = urlConfig.backend+"wardrelation/?parent="+parent.id;
      genericGetAll($http,wardUrl,callback);
    },
    getWardReviews: function(ward, callback){
      var reviewUrl = urlConfig.backend+"studentreview/?sort=createdAt DESC&student="+ward.id;
      genericGetAll($http,reviewUrl,callback);
    },
    addParent : function(wardRelation, callback){
      var createUrl = urlConfig.backend + "wardrelation/create";
      $http.post(createUrl,wardRelation)
        .error(function(data, status, headers, config) {
          console.log("Error in creating relation!");
          callback(data);
        })
        .then(function(res){
          console.log('Review posted! '+ res.data);
          callback(res.data)
        });
      }
    }

});
