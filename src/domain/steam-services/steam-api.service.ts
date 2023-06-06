import {
  Injectable,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';

import ISteamUser from 'interfaces/ISteamUser';

import { steamUserMapper } from 'mappers/steamUserMapper';
import { steamStatsMapper } from 'mappers/steamStatsMapper';
import { steamLinks } from 'utils/steamLinks';

const { steamStats, steamUsers, steamLevel, steamFriends } = steamLinks;

@Injectable()
export class SteamApiService {
  constructor(private readonly http: HttpService) {}

  async getUserData(id: string): Promise<ISteamUser> {
    const foundUsers = await firstValueFrom(
      this.http.get(`/${steamUsers}?steamids=${id}`),
    );

    const foundPlayer = foundUsers.data.response.players.find(
      ({ steamid }) => steamid === id,
    );

    if (!foundPlayer) throw new NotFoundException();

    const foundLevel = await firstValueFrom(
      this.http.get(`/${steamLevel}?steamid=${id}`),
    );

    let mappedPlayer = steamUserMapper(foundPlayer);

    const player = {
      ...mappedPlayer,
      level: foundLevel.data.response.player_level,
    };
    return player;
  }

  async getUserStats(id: string) {
    const foundStats = await firstValueFrom(
      this.http.get(`/${steamStats}?steamid=${id}`).pipe(
        catchError((err) => {
          throw new BadGatewayException(
            'Steam API is not avaliable',
            err.response.data,
          );
        }),
      ),
    );

    const result = steamStatsMapper(foundStats.data.playerstats.stats);

    return result;
  }

  async getUserFriends(id: string): Promise<ISteamUser[]> {
    const foundFriendsList = await firstValueFrom(
      this.http.get(`/${steamFriends}?steamid=${id}`),
    );

    const mappedFriendsList = foundFriendsList.data.friendslist.friends
      .map(({ steamid }) => steamid)
      .join(',');

    const friends = await firstValueFrom(
      this.http.get(`/${steamUsers}?steamids=${mappedFriendsList}`),
    );

    const mappedFriends = friends.data.response.players.map((player) =>
      steamUserMapper(player),
    );

    return mappedFriends;
  }
}
