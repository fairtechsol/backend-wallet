const internalRedis = require("../config/internalRedisConnection");
const { sendMessageToUser } = require("../sockets/socketManager");

exports.forceLogoutIfLogin = async (userId) => {
    let token = await internalRedis.hget(userId,"token");
  
    if (token) {
      // function to force logout
      sendMessageToUser(userId,"logoutUserForce",null)
    }
  };

  exports.calculatePartnership = async (userData, creator) => {
    if (userData.roleName == userRoleConstant.fairGameWallet) {
      return {};
    }
  
    // user created by fairgame wallet
    let fwPartnership = creator.fwPartnership;
    let faPartnership = creator.faPartnership;
    let saPartnership = creator.saPartnership;
    let aPartnership = creator.aPartnership;
    let smPartnership = creator.smPartnership;
    let mPartnership = creator.mPartnership;
  
    switch (creator.roleName) {
      case (userRoleConstant.fairGameWallet): {
        fwPartnership = creator.myPartnership;
        break;
      }
      case (userRoleConstant.fairGameAdmin): {
        faPartnership = creator.myPartnership;
        break;
      }
      case (userRoleConstant.superAdmin): {
        saPartnership = creator.myPartnership;
        break;
      }
      case (userRoleConstant.admin): {
        aPartnership = creator.myPartnership;
        break;
      }
      case (userRoleConstant.superMaster): {
        smPartnership = creator.myPartnership;
        break;
      }
      case (userRoleConstant.master): {
        mPartnership = creator.myPartnership;
        break;
      }
    }
  
    switch (creator.roleName) {
      case (userRoleConstant.fairGameWallet): {
        switch (userData.roleName) {
          case (userRoleConstant.fairGameAdmin): {
            faPartnership = 100 - parseInt(creator.myPartnership);
            break;
          }
          case (userRoleConstant.superAdmin): {
            saPartnership = 100 - parseInt(creator.myPartnership);
            break;
          }
          case (userRoleConstant.admin): {
            aPartnership = 100 - parseInt(creator.myPartnership);
            break;
          }
          case (userRoleConstant.superMaster): {
            smPartnership = 100 - parseInt(creator.myPartnership);
            break;
          }
          case (userRoleConstant.master): {
            mPartnership = 100 - parseInt(creator.myPartnership);
            break;
          }
        }
      }
        break;
      case (userRoleConstant.fairGameAdmin): {
        switch (userData.roleName) {
          case (userRoleConstant.superAdmin): {
            saPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
            break;
          }
          case (userRoleConstant.admin): {
            aPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
            break;
          }
          case (userRoleConstant.superMaster): {
            smPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
            break;
          }
          case (userRoleConstant.master): {
            mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
            break;
          }
        }
      }
        break;
      case (userRoleConstant.superAdmin): {
        switch (userData.roleName) {
          case (userRoleConstant.admin): {
            aPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership);
            break;
          }
          case (userRoleConstant.superMaster): {
            smPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership);
            break;
          }
          case (userRoleConstant.master): {
            mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership);
            break;
          }
        }
      }
        break;
      case (userRoleConstant.admin): {
        switch (userData.roleName) {
          case (userRoleConstant.superMaster): {
            smPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership);
            break;
          }
          case (userRoleConstant.master): {
            mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership);
            break;
          }
        }
      }
        break;
      case (userRoleConstant.superMaster): {
        switch (userData.roleName) {
          case (userRoleConstant.master): {
            mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership + aPartnership);
            break;
          }
        }
      }
        break;
    }
  
    if (userData.roleName != userRoleConstant.expert && fwPartnership + faPartnership + saPartnership + aPartnership + smPartnership + mPartnership != 100) {
      throw new Error("user.partnershipNotValid");
    }
    return {
      fwPartnership,
      faPartnership,
      saPartnership,
      aPartnership,
      smPartnership,
      mPartnership
    }
  }
  
  exports.checkUserCreationHierarchy = (creator, createUserRoleName) => {
    const hierarchyArray = Object.values(userRoleConstant)
    let creatorIndex = hierarchyArray.indexOf(creator.roleName)
    if (creatorIndex == -1) return false
    let index = hierarchyArray.indexOf(createUserRoleName)
    if (index == -1) return false
    if (index < creatorIndex) return false;
    if (createUserRoleName == userRoleConstant.expert && creator.roleName !== userRoleConstant.fairGameAdmin) {
      return false
    }
    return true
  
  }