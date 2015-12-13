function genericGetAll($http, url, callback){
  $http.get(url).then(function(res){
      callback(res.data);
    },
    function(err){
      callback(null);
  });
}

angular.module('starter.services', ['ionic', 'ngCookies', 'starter.config'])
.factory('socket',function(socketFactory, urlConfig){
        //Create socket and connect to http://chat.socket.io
         var myIoSocket = io.connect(urlConfig.backend);

          mySocket = socketFactory({
            ioSocket: myIoSocket
          });

        return mySocket;
})
.directive('focusMe', function($timeout) {
  return {
    scope: {
       focusValue: "=focusMe"
   },
       link: function(scope, element, attrs) {
           console.log("focusMe directiveinit " + scope.focusValue);
           if( scope.focusValue ) {
               $timeout(function() {
                   console.log(" adding focus to element")

                   element[0].focus();
               });
           }
       }
   };
})
.factory('Chats', function($http, urlConfig, sessionService) {
  var url = urlConfig.backend+"chats";
  return {
    getChats: function (fromId, toId,skip, callback) {
      var getUrl = url+'?where={"from":["'+fromId+'","'+toId+'"],"to":["'+fromId+'","'+toId+'"]}&skip='+skip;
      console.log(getUrl);
      genericGetAll($http,getUrl,callback);
    },
    sendChat : function (chatObj, errorCb, successCb) {
      console.log(chatObj);
      var createUrl = url+"/createChat";
      $http.post(createUrl,chatObj)
      .error(function(data, status, headers, config) {
        console.log("Error in sending message!");
        if(errorCb){
          errorCb();
        }
      })
      .then(function(res){
        console.log('Message sent! '+ res.data);
        if(successCb){
          successCb();
        }
      });
    },
    sendGroupChat : function (chatObj, errorCb, successCb) {
      console.log(chatObj);
      var createUrl = url+"/sendGroupChat";
      $http.post(createUrl,chatObj)
      .error(function(data, status, headers, config) {
        console.log("Error in sending group message!");
        if(errorCb){
          errorCb();
        }
      })
      .then(function(res){
        console.log('Group Message sent! '+ res.data);
        if(successCb){
          successCb();
        }
      });
    },
    createGroup : function(group,errorCb,successCb){
      var createUrl = urlConfig.backend +"groups/create";
      $http.post(createUrl,group)
      .error(function(data, status, headers, config) {
        console.log("Error in creating group!");
        if(errorCb){
          errorCb();
        }
      })
      .then(function(res){
        console.log('Group created! '+ res.data);
        if(successCb){
          successCb();
        }
      });
    },
    getMyGroups: function(cb){
      var getUrl = urlConfig.backend + "groups/getGroupsWithUser?user="+sessionService.get("loginData").user.id;
      genericGetAll($http,getUrl,cb);
    },
    getGroupChat: function(groupId,skip,cb){
      if(!skip){
        skip = 0;
      }
      var getUrl = url + "?group="+groupId+'&skip='+skip+'&sort=createdAt ASC';
      genericGetAll($http,getUrl,cb);
    },
    getMyUsers: function(userId,cb){
      var getUrl = url + "/distinctChatUsers?userid="+userId;
      genericGetAll($http, getUrl, cb);
    },
    getUserFromCache: function(userId){
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
  var url = urlConfig.backend + "schools"
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
  var url = urlConfig.backend+"classes";
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
    },
    updateTeacher : function(model, success, error){
      updateUrl = url+"/update/"+model.id;
      $http.post(updateUrl,model)
        .error(function(data, status, headers, config) {
          console.log("Error in update");
          error();
        })
        .then(function(res){
          console.log('Updated! '+ res.data);
          success();
        });
      },
      getAllTeachersOfSchool: function(schoolId, callback){
        var getUrl = url+"?school="+schoolId;
        genericGetAll($http, getUrl, callback);
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
    },
    updateParent: function(model, success, error){
      updateUrl = url+"/update/"+model.id;
      $http.post(updateUrl,model)
        .error(function(data, status, headers, config) {
          console.log("Error in update " + updateUrl);
          error();
        })
        .then(function(res){
          console.log('Updated! ', res.data);
          success();
        });
      },
      getAllParentsOfSchool: function(schoolId, callback){
        var getUrl = url+"?school="+schoolId;
        console.log(getUrl);
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
      console.log(wardUrl);
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

})
.factory('feedback', function($http, urlConfig){
  var url = urlConfig.backend+"feedback";
  return {
    postFeedback: function (feedback,successCb, errCb) {
      var createUrl = url+"/create";
      $http.post(createUrl, feedback)
      .error(function(data, status, headers, config) {
        console.log("Error in posting feedback");
        if(errCb){
          errCb(data);
        }
      })
      .then(function(res){
        console.log('Feedback posted! '+ res.data);
        if(successCb){
          successCb(res.data);
        }
      });
    }
  };
})
.factory('user', function($http, urlConfig){
  var url = urlConfig.backend+"user";
  return {
    changePassword: function (user,successCb, errCb) {
      var changeUrl = url+"/changePassword";
      $http.post(changeUrl,user)
      .error(function(data, status, headers, config) {
        console.log("Error in changing password");
        if(errCb){
          errCb(data);
        }
      })
      .then(function(res){
        console.log('Password changed! '+ res.data);
        if(successCb){
          successCb(res.data);
        }
      });
    }
  };
});
