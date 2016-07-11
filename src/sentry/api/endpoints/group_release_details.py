from __future__ import absolute_import

from rest_framework.response import Response

from sentry.app import tsdb
from sentry.api.base import StatsMixin
from sentry.api.bases.group import GroupEndpoint
from sentry.api.exceptions import ResourceDoesNotExist
from sentry.api.serializers import serialize
from sentry.models import GroupRelease, Release


class GroupReleaseDetailsEndpoint(GroupEndpoint, StatsMixin):
    def get(self, request, group, version, environment=''):
        # TODO(dcramer): environment should default to 'default environment'
        try:
            if version == ':latest':
                release = Release.objects.filter(
                    project=group.project_id,
                ).order_by('-date_added')[0:1].get()
            else:
                release = Release.objects.get(
                    project=group.project_id,
                    version=version,
                )
        except Release.DoesNotExist:
            raise ResourceDoesNotExist

        try:
            grouprelease = GroupRelease.objects.get(
                release_id=release.id,
                group_id=group.id,
                environment=environment,
            )
        except GroupRelease.DoesNotExist:
            data = []
        else:
            try:
                data = tsdb.get_frequency_series(
                    model=tsdb.models.frequent_releases_by_groups,
                    items={
                        group.id: [grouprelease.id],
                    },
                    **self._parse_args(request)
                )[group.id]
            except NotImplementedError:
                # TODO(dcramer): probably should log this, but not worth
                # erring out
                data = []
            else:
                data = [
                    (k, v[grouprelease.id])
                    for k, v in data
                ]

        context = serialize(release, request.user)
        context['stats'] = data
        return Response(context)
